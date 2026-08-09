# Step 1: Login
$loginBody = '{"email":"user@makemycrip.com","password":"Password@123"}'
$loginResp = Invoke-WebRequest -Uri 'http://localhost:8081/api/v1/auth/login' -Method POST -Body $loginBody -ContentType 'application/json' -UseBasicParsing | ConvertFrom-Json
$token = $loginResp.data.accessToken
Write-Host "Token: $($token.Substring(0,30))..."

$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }

# Step 2: Test booking WITHOUT add-ons (was broken due to @Future on checkIn)
$body1 = '{"roomTypeId":"31000000-0000-0000-0000-000000000001","checkIn":"2026-05-08","checkOut":"2026-05-10","adults":1,"primaryGuest":{"firstName":"Test","lastName":"User","email":"user@makemycrip.com","phone":"9876543210"}}'
try {
    $r1 = Invoke-WebRequest -Uri 'http://localhost:8081/api/v1/bookings/initiate' -Method POST -Body $body1 -Headers $headers -UseBasicParsing | ConvertFrom-Json
    Write-Host "Test1 (no addons): HTTP 201, bookingRef=$($r1.data.bookingRef), total=$($r1.data.totalAmount)"
} catch {
    $errBody = $_.Exception.Response
    Write-Host "Test1 ERROR: $($_.Exception.Message)"
}

# Step 3: Test booking WITH add-ons (DINNER x1 = 600, BREAKFAST x1 = 350)
$body2 = '{"roomTypeId":"31000000-0000-0000-0000-000000000001","checkIn":"2026-05-09","checkOut":"2026-05-11","adults":1,"primaryGuest":{"firstName":"Test","lastName":"User","email":"user@makemycrip.com","phone":"9876543210"},"addOns":[{"type":"DINNER","quantity":1},{"type":"BREAKFAST","quantity":1}]}'
try {
    $r2 = Invoke-WebRequest -Uri 'http://localhost:8081/api/v1/bookings/initiate' -Method POST -Body $body2 -Headers $headers -UseBasicParsing | ConvertFrom-Json
    Write-Host "Test2 (with addons): HTTP 201, bookingRef=$($r2.data.bookingRef), total=$($r2.data.totalAmount), addOnAmount=$($r2.data.addOnAmount)"
} catch {
    Write-Host "Test2 ERROR: $($_.Exception.Message)"
}

# Step 4: Test that past date is rejected with meaningful error
$body3 = '{"roomTypeId":"31000000-0000-0000-0000-000000000001","checkIn":"2025-01-01","checkOut":"2025-01-03","adults":1,"primaryGuest":{"firstName":"Test","lastName":"User","email":"user@makemycrip.com","phone":"9876543210"}}'
try {
    $r3 = Invoke-WebRequest -Uri 'http://localhost:8081/api/v1/bookings/initiate' -Method POST -Body $body3 -Headers $headers -UseBasicParsing | ConvertFrom-Json
    Write-Host "Test3 (past date): Should have been rejected but got $($r3.status)"
} catch {
    Write-Host "Test3 (past date correctly rejected): $($_.Exception.Message)"
}

# Step 5: Test that unknown add-on type is gracefully skipped
$body4 = '{"roomTypeId":"31000000-0000-0000-0000-000000000001","checkIn":"2026-05-10","checkOut":"2026-05-12","adults":1,"primaryGuest":{"firstName":"Test","lastName":"User","email":"user@makemycrip.com","phone":"9876543210"},"addOns":[{"type":"BICYCLE_RENTAL","quantity":2},{"type":"AIRPORT_TRANSFER","quantity":1}]}'
try {
    $r4 = Invoke-WebRequest -Uri 'http://localhost:8081/api/v1/bookings/initiate' -Method POST -Body $body4 -Headers $headers -UseBasicParsing | ConvertFrom-Json
    Write-Host "Test4 (BICYCLE_RENTAL+AIRPORT_TRANSFER): bookingRef=$($r4.data.bookingRef), total=$($r4.data.totalAmount), addOnAmount=$($r4.data.addOnAmount)"
} catch {
    Write-Host "Test4 ERROR: $($_.Exception.Message)"
}
