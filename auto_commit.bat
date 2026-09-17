@echo off
echo =========================================
echo       Auto-Commit ^& Push Script
echo =========================================
echo This script will check for changes every
echo 60 seconds and automatically push them
echo to your GitHub repository.
echo.
echo Press Ctrl+C to stop the script.
echo =========================================
echo.

:loop
:: Check for any changes (including untracked files)
git status --porcelain > %temp%\git-status.tmp
for /f %%i in ("%temp%\git-status.tmp") do set size=%%~zi
if %size% gtr 0 (
    echo [%time%] Changes detected! Committing and pushing...
    git add .
    git commit -m "Auto-commit: %date% %time%"
    git push origin main
    echo [%time%] Successfully pushed to GitHub!
) else (
    echo [%time%] No changes detected.
)

:: Clean up temp file
del %temp%\git-status.tmp

:: Wait for 60 seconds
timeout /t 60 /nobreak > nul
goto loop
