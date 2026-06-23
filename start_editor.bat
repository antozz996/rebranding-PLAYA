@echo off
title Playa Luna Editor Starter
echo ===================================================
echo   AVVIATORE DASHBOARD EDITOR - PLAYA LUNA
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Check Python
python --version >nul 2>&1
if errorlevel 1 goto nopython

:: 2. Check Virtual Environment (.venv)
if not exist ".venv" goto novenv

:run
:: 3. Activate Virtual Environment and install packages
echo Attivazione ambiente virtuale...
call .venv\Scripts\activate.bat

echo Verifica e installazione delle dipendenze (requirements.txt)...
pip install -r editor/backend/requirements.txt
if errorlevel 1 goto noinstall

:: 4. Start browser after short delay
echo Avvio del browser all'indirizzo http://localhost:8000 ...
start http://localhost:8000

:: 5. Start FastAPI Backend
echo Avvio del server backend FastAPI...
python editor/backend/main.py
goto end

:nopython
echo [ERRORE] Python non e' installato nel sistema o non e' nel PATH.
echo Per favore installa Python 3.9 o superiore per continuare.
pause
exit /b 1

:novenv
echo Creazione ambiente virtuale Python .venv...
python -m venv .venv
if errorlevel 1 goto novenv_fail
goto run

:novenv_fail
echo [ERRORE] Impossibile creare l'ambiente virtuale.
pause
exit /b 1

:noinstall
echo [ERRORE] Installazione delle dipendenze fallita.
pause
exit /b 1

:end
pause
