@echo off
chcp 65001 >nul
title CastIt Dev Server
color 0E
cd /d "%~dp0"

echo.
echo  ============================================
echo                CastIt - Starting...
echo  ============================================
echo.

REM Free port 3000 if something is blocking it
echo  Checking port 3000...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo  Killing process %%P that uses port 3000...
    taskkill /F /PID %%P >nul 2>&1
)

echo  Starting dev server (takes ~5 seconds)...
echo  Browser will open automatically when ready.
echo.
echo  TO STOP: Close this window or press Ctrl+C
echo.

REM Open browser after server is ready
start "" cmd /c "timeout /t 7 /nobreak >nul & start http://localhost:3000"

call npm run dev

echo.
echo  Server stopped. Press any key to close...
pause >nul
