# Test directo contra el endpoint de producción en Vercel
# Crea un turno real y captura la respuesta completa del backend

$body = @{
    service_id = "dummy"
    start_time = "2026-09-01T10:00:00"
    patient_full_name = "Hassel Espinosa"
    patient_whatsapp = "1155769048"
} | ConvertTo-Json

Write-Host "=== TEST BOOKING ENDPOINT PRODUCCION ===" -ForegroundColor Cyan
$response = Invoke-WebRequest `
    -Uri "https://citaly-six.vercel.app/api/v1/booking/appointments" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing

Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
Write-Host "Response Body:" -ForegroundColor Yellow
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
