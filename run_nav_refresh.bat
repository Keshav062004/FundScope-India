@echo off
REM Daily real-NAV refresh. Works from any folder: uses the script's own location.
cd /d "%~dp0"

if not exist "logs" mkdir "logs"

echo. >> "logs\nav_refresh.log"
echo ======================================== >> "logs\nav_refresh.log"
echo Refresh started: %date% %time% >> "logs\nav_refresh.log"

".venv\Scripts\python.exe" -m src.data_sources.refresh_real_nav >> "logs\nav_refresh.log" 2>&1
set "RESULT=%ERRORLEVEL%"

echo Refresh finished: %date% %time% >> "logs\nav_refresh.log"
echo Exit code: %RESULT% >> "logs\nav_refresh.log"

exit /b %RESULT%
