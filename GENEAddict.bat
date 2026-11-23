@echo off
rem ---------------------------------------------------------------
rem  GENEAddict - lanceur Windows
rem  Ouvre index.html dans Chrome (ou Edge a defaut) en mode
rem  application : fenetre dediee, sans onglets ni barre d'adresse,
rem  meme si Firefox est le navigateur par defaut.
rem ---------------------------------------------------------------
setlocal
set "PAGE=%~dp0index.html"
set "NAV="

for %%P in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do (
  if not defined NAV if exist "%%~P" set "NAV=%%~P"
)

if not defined NAV (
  echo Ni Chrome ni Edge n'ont ete trouves sur cet ordinateur.
  echo Ouvrez index.html a la main avec Chrome ou Edge.
  pause
  exit /b 1
)

set "URL=file:///%PAGE:\=/%"
start "" "%NAV%" --app="%URL%"
