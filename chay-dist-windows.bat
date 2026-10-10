@echo off
title PhotoPrint Local (Ban Build Tinh)
color 0A

cd /d "%~dp0"

echo ===================================================
echo     PhotoPrint Local - Khoi chay ban Build Tinh
echo ===================================================
echo.

:: Kiem tra co thu muc dist chua
if not exist "dist\" (
    echo [Loi] Chua tim thay thu muc dist! Vui long build truoc: npm run build
    pause
    exit /b
)

:: Mo trinh duyet sau 1 giay
start "" cmd /c "timeout /t 1 /nobreak >nul && start http://localhost:5173"

:: Uu tien chay bang Python neu may da co
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo Dang khoi chay bang Python tai http://localhost:5173...
    echo Nhan Ctrl + C de dung.
    python -m http.server 5173 --directory dist
    exit /b
)

:: Neu co Node/NPX thi chay bang npx serve
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo Dang khoi chay bang NPX tai http://localhost:5173...
    echo Nhan Ctrl + C de dung.
    call npx serve dist -l 5173
    exit /b
)

echo [Thong bao] May chua cai Python hoac Node.js.
echo Vui long cai dat Node.js hoac Python de chay server noi bo.
pause
