@echo off
cd /d "%~dp0"
echo Instalowanie zaleznosci backendu ABW...
call npm --prefix backend install
if errorlevel 1 goto error

echo Przygotowanie bazy PostgreSQL...
call npm run migrate
if errorlevel 1 goto error

echo Uruchamianie ABW Online OS...
call npm start
goto end

:error
echo.
echo Nie udalo sie uruchomic serwera. Sprawdz plik .env i polaczenie PostgreSQL.
pause

:end
