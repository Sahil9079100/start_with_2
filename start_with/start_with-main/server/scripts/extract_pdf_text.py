#!/usr/bin/env python3
"""
Optimized PDF text extraction script.
Strategy:
1. Try PyMuPDF native text extraction (fastest, no OCR needed)
2. If text is too short/empty, fall back to OCR (PyMuPDF + pytesseract)

Usage:
    python extract_pdf_text.py <pdf_path> [--min-chars=50]
    
    # Or read from stdin (pipe PDF bytes):
    cat resume.pdf | python extract_pdf_text.py --stdin

Output: JSON with extracted text and metadata
"""

import sys
import os
import json
import argparse
import traceback

# Print errors to stderr for debugging
def log_error(msg):
    print(f"[Python OCR ERROR] {msg}", file=sys.stderr)

def log_info(msg):
    print(f"[Python OCR INFO] {msg}", file=sys.stderr)

# Check dependencies at startup
def check_dependencies():
    missing = []
    
    try:
        import fitz
        log_info(f"PyMuPDF version: {fitz.version}")
    except ImportError as e:
        missing.append(f"PyMuPDF (fitz): {e}")
    
    try:
        from PIL import Image
        log_info(f"Pillow available")
    except ImportError as e:
        missing.append(f"Pillow: {e}")
    
    try:
        import pytesseract
        # Try to get tesseract version
        try:
            version = pytesseract.get_tesseract_version()
            log_info(f"Tesseract version: {version}")
        except Exception as te:
            log_error(f"Tesseract binary not found or not working: {te}")
            missing.append(f"Tesseract binary not installed or not in PATH")
    except ImportError as e:
        missing.append(f"pytesseract: {e}")
    
    return missing

# Lazy imports for faster startup when not needed
def get_fitz():
    import fitz  # PyMuPDF
    return fitz

def get_pytesseract():
    import pytesseract
    return pytesseract

def get_pil_image():
    from PIL import Image
    return Image


def extract_text_native(pdf_bytes: bytes) -> tuple[str, int]:
    """
    Extract text using PyMuPDF's native text extraction.
    Returns (text, page_count)
    """
    fitz = get_fitz()
    doc = None
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)
        log_info(f"Opened PDF with {page_count} pages")
        
        pages_text = []
        for page_num in range(page_count):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            if text and text.strip():
                pages_text.append(text.strip())
            log_info(f"Page {page_num + 1}: extracted {len(text) if text else 0} chars")
        
        full_text = "\n\n--- Page Break ---\n\n".join(pages_text)
        return full_text, page_count
    finally:
        if doc:
            doc.close()


def extract_text_ocr(pdf_bytes: bytes, dpi: int = 150, lang: str = "eng") -> tuple[str, list]:
    """
    Extract text using OCR (PyMuPDF for rendering + pytesseract).
    Lower DPI = faster but less accurate. 150 is a good balance.
    Returns (text, page_details)
    """
    fitz = get_fitz()
    pytesseract = get_pytesseract()
    Image = get_pil_image()
    
    doc = None
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)
        log_info(f"OCR: Opened PDF with {page_count} pages")
        
        pages_text = []
        page_details = []
        
        # Calculate zoom factor for desired DPI (PyMuPDF default is 72 DPI)
        zoom = dpi / 72.0
        matrix = fitz.Matrix(zoom, zoom)
        
        for page_num in range(page_count):
            try:
                page = doc.load_page(page_num)
                log_info(f"OCR: Processing page {page_num + 1}...")
                
                # Render page to image (pixmap)
                pix = page.get_pixmap(matrix=matrix, alpha=False)
                
                # Convert to PIL Image (pytesseract accepts PIL images directly)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Run OCR
                text = pytesseract.image_to_string(img, lang=lang)
                confidence = 0  # pytesseract can return confidence via image_to_data, but slower
                
                if text and text.strip():
                    pages_text.append(text.strip())
                    page_details.append({
                        "page": page_num + 1,
                        "chars": len(text.strip()),
                        "confidence": confidence
                    })
                
                log_info(f"OCR: Page {page_num + 1} done, extracted {len(text.strip()) if text else 0} chars")
                
                # Cleanup
                del pix
                del img
                
            except Exception as e:
                log_error(f"OCR: Error on page {page_num + 1}: {str(e)}")
                page_details.append({
                    "page": page_num + 1,
                    "error": str(e)
                })
        
        full_text = "\n\n--- Page Break ---\n\n".join(pages_text)
        return full_text, page_details
    finally:
        if doc:
            doc.close()


def extract_text(pdf_bytes: bytes, min_chars: int = 50, ocr_dpi: int = 150, lang: str = "eng") -> dict:
    """
    Main extraction function.
    1. Try native text extraction
    2. Fall back to OCR if text is too short
    """
    result = {
        "success": True,
        "text": "",
        "method": "native",
        "page_count": 0,
        "char_count": 0,
        "ocr_used": False,
        "error": None
    }
    
    try:
        log_info(f"Starting extraction, PDF size: {len(pdf_bytes)} bytes")
        
        # Step 1: Try native extraction
        text, page_count = extract_text_native(pdf_bytes)
        result["page_count"] = page_count
        
        log_info(f"Native extraction: {len(text.strip())} chars from {page_count} pages")
        
        if len(text.strip()) >= min_chars:
            result["text"] = text
            result["char_count"] = len(text)
            result["method"] = "native"
            log_info("Using native extraction result")
            return result
        
        # Step 2: Native extraction didn't yield enough text, use OCR
        log_info(f"Native extraction yielded only {len(text.strip())} chars (< {min_chars}), falling back to OCR")
        ocr_text, page_details = extract_text_ocr(pdf_bytes, dpi=ocr_dpi, lang=lang)
        result["text"] = ocr_text
        result["char_count"] = len(ocr_text)
        result["method"] = "ocr"
        result["ocr_used"] = True
        result["ocr_details"] = page_details
        log_info(f"OCR extraction complete: {len(ocr_text)} chars")
        
    except Exception as e:
        error_msg = str(e)
        log_error(f"Extraction error: {error_msg}")
        log_error(traceback.format_exc())
        result["success"] = False
        result["error"] = error_msg
    
    return result


def main():
    parser = argparse.ArgumentParser(description="Extract text from PDF")
    parser.add_argument("pdf_path", nargs="?", help="Path to PDF file")
    parser.add_argument("--stdin", action="store_true", help="Read PDF from stdin")
    parser.add_argument("--min-chars", type=int, default=50, help="Minimum chars before OCR fallback")
    parser.add_argument("--ocr-dpi", type=int, default=150, help="DPI for OCR rendering (lower=faster)")
    parser.add_argument("--lang", default="eng", help="Tesseract language code")
    parser.add_argument("--check-deps", action="store_true", help="Check dependencies and exit")
    
    args = parser.parse_args()
    
    # Check dependencies first
    missing_deps = check_dependencies()
    
    if args.check_deps:
        if missing_deps:
            print(json.dumps({"success": False, "error": f"Missing dependencies: {', '.join(missing_deps)}"}))
            sys.exit(1)
        else:
            print(json.dumps({"success": True, "message": "All dependencies installed"}))
            sys.exit(0)
    
    if missing_deps:
        error_msg = f"Missing dependencies: {', '.join(missing_deps)}"
        log_error(error_msg)
        print(json.dumps({"success": False, "error": error_msg}))
        sys.exit(1)
    
    # Read PDF bytes
    try:
        if args.stdin:
            log_info("Reading PDF from stdin...")
            pdf_bytes = sys.stdin.buffer.read()
            log_info(f"Read {len(pdf_bytes)} bytes from stdin")
        elif args.pdf_path:
            log_info(f"Reading PDF from file: {args.pdf_path}")
            with open(args.pdf_path, "rb") as f:
                pdf_bytes = f.read()
            log_info(f"Read {len(pdf_bytes)} bytes from file")
        else:
            print(json.dumps({"success": False, "error": "No input provided. Use --stdin or provide path."}))
            sys.exit(1)
    except Exception as e:
        error_msg = f"Failed to read PDF: {str(e)}"
        log_error(error_msg)
        log_error(traceback.format_exc())
        print(json.dumps({"success": False, "error": error_msg}))
        sys.exit(1)
    
    if not pdf_bytes:
        print(json.dumps({"success": False, "error": "Empty PDF input"}))
        sys.exit(1)
    
    # Extract text
    try:
        result = extract_text(
            pdf_bytes,
            min_chars=args.min_chars,
            ocr_dpi=args.ocr_dpi,
            lang=args.lang
        )
    except Exception as e:
        error_msg = f"Extraction failed: {str(e)}"
        log_error(error_msg)
        log_error(traceback.format_exc())
        result = {"success": False, "error": error_msg}
    
    # Output JSON
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result.get("success", False) else 1)


if __name__ == "__main__":
    main()
