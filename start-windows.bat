@echo off
title PhotoPrint Local - In anh the Epson
color 0A

echo ===================================================
echo     PhotoPrint Local - Khoi dong ung dung
echo ===================================================
echo.

cd /d "%~dp0"

:: Kiem tra Node.js da duoc cai dat chua
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [Loi] May chua cai Node.js!
    echo Vui long truy cap https://nodejs.org/ de tai va cai Node.js (ban LTS).
    echo.
    pause
    exit /b
)

:: Kiem tra neu chua co node_modules thi tu dong cai dat
if not exist "node_modules\" (
    echo [Thong bao] Dang cai dat cac thu vien can thiet lan dau...
    call npm install
    if %errorlevel% neq 0 (
        echo [Loi] Khong the cai dat thu vien. Vui long kiem tra ket noi mang.
        pause
        exit /b
    )
)

:: Mo trinh duyet sau 2 giay
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5173"

echo.
echo Dang khoi chay may chu in anh tai: http://localhost:5173
echo Nhap Ctrl + C tren cua so nay neu muon tat ung dung.
echo.

call npm run dev
pause
