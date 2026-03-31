@echo off
echo Starting Phishing Email Detector...
echo Open http://localhost:3000 in your browser
echo.
cd /d "%~dp0"
npx serve . -p 3000
pause
