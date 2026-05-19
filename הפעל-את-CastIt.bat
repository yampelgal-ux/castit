@echo off
chcp 65001 >nul
title CastIt - Dev Server
color 0E

echo.
echo  ╔════════════════════════════════════════╗
echo  ║                                        ║
echo  ║       🎬  CastIt — מפעיל שרת...      ║
echo  ║                                        ║
echo  ╚════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM Open browser after 6 seconds
start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:3000"

echo  השרת מתחיל לעלות... (יקח כמה שניות)
echo  הדפדפן ייפתח אוטומטית כשהשרת מוכן.
echo.
echo  ⚠️  לעצור את השרת: סגרי את החלון הזה או לחצי Ctrl+C
echo.

npm run dev

echo.
echo  השרת נעצר. הקישי על כל מקש לסגור...
pause >nul
