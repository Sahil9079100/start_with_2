# PowerShell smoke test for /api/deepgram-tts/transcribe
# Usage: Open PowerShell and run: .\transcribe_test_sample.ps1

$apiUrl = 'http://localhost:8001/api/deepgram-tts/transcribe'
# A very small silent audio base64 sample (not real speech) - for structure testing only.
$sampleBase64 = 'AAAA'
$body = @{ audio = $sampleBase64; format = 'webm' } | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Method Post -Uri $apiUrl -Body $body -ContentType 'application/json'
    Write-Output "Response:`n$($res | ConvertTo-Json -Depth 5)"
} catch {
    Write-Error "Request failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $txt = $reader.ReadToEnd();
        Write-Output "Response body:`n$txt"
    }
}
