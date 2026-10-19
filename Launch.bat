@echo off
setlocal
cd /d "%~dp0"
set "JAVA=javaw"
if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.8.9-hotspot\bin\javaw.exe" set "JAVA=C:\Program Files\Eclipse Adoptium\jdk-21.0.8.9-hotspot\bin\javaw.exe"
if "%JAVA%"=="javaw" if defined JAVA_HOME if exist "%JAVA_HOME%\bin\javaw.exe" set "JAVA=%JAVA_HOME%\bin\javaw.exe"
start "" "%JAVA%" -jar "%~dp0WiseOldManEventCreator.jar"
