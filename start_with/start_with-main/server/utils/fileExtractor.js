import fs from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import libre from 'libreoffice-convert';
import { promisify } from 'util';
import Tesseract from 'tesseract.js';

const libreConvert = promisify(libre.convert);

async function pdfToText(buffer) {
    try {
        const data = await pdfParse(buffer);
        return data.text || '';
    } catch (e) {
        console.error('pdfToText error', e);
        return '';
    }
}

async function docxToText(buffer) {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value || '';
    } catch (e) {
        console.error('docxToText error', e);
        return '';
    }
}

function xlsxToText(buffer) {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheets = workbook.SheetNames || [];
        const rows = [];
        for (const name of sheets) {
            const sheet = workbook.Sheets[name];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            for (const r of json) {
                rows.push(r.join(' | '));
            }
        }
        return rows.join('\n');
    } catch (e) {
        console.error('xlsxToText error', e);
        return '';
    }
}

function csvToText(buffer) {
    try {
        const text = buffer.toString('utf8');
        const records = csvParse(text, { skip_empty_lines: true });
        return records.map(r => r.join(' | ')).join('\n');
    } catch (e) {
        console.error('csvToText error', e);
        return '';
    }
}

async function imageToText(buffer) {
    try {
        const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
        return text || '';
    } catch (e) {
        console.error('imageToText error', e);
        return '';
    }
}

async function libreOfficeConvert(buffer, toExt = '.pdf') {
    try {
        const done = await libreConvert(buffer, toExt, undefined);
        return done;
    } catch (e) {
        console.error('libreOfficeConvert error', e);
        return null;
    }
}

export async function extractTextFromBuffer(buffer, originalName = '') {
    if (!buffer) return '';

    try {
        const ft = await fileTypeFromBuffer(buffer).catch(() => null);
        const ext = ft?.ext ? ft.ext.toLowerCase() : path.extname(originalName).replace('.', '').toLowerCase();

        // Prefer direct handlers for common types
        if (ext === 'pdf' || ft?.mime === 'application/pdf') {
            return await pdfToText(buffer);
        }

        if (ext === 'docx' || ft?.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return await docxToText(buffer);
        }

        if (ext === 'doc') {
            // convert to pdf then extract
            const converted = await libreOfficeConvert(buffer, '.pdf');
            if (converted) return await pdfToText(converted);
            return '';
        }

        if (ext === 'txt' || ft?.mime === 'text/plain') {
            return buffer.toString('utf8');
        }

        if (ext === 'csv' || ft?.mime === 'text/csv') {
            return csvToText(buffer);
        }

        if (ext === 'xls' || ext === 'xlsx' || ft?.mime === 'application/vnd.ms-excel' || ft?.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            return xlsxToText(buffer);
        }

        if (ft && ft.mime && ft.mime.startsWith('image/')) {
            return await imageToText(buffer);
        }

        // Fallback: try to convert to PDF using LibreOffice and extract
        const converted = await libreOfficeConvert(buffer, '.pdf');
        if (converted) {
            return await pdfToText(converted);
        }

        return '';
    } catch (e) {
        console.error('extractTextFromBuffer error', e);
        return '';
    }
}

export default { extractTextFromBuffer };
