@echo off
echo Stopping existing React app...

for /f "tokens=5" %%a in ('netstat -aon ^| find "3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a
    goto :exit
)

where npm >nul || (echo Installing Node.js... && choco install nodejs -y)
start /wait cmd /c "if not exist node_modules npm install"

:exit
echo React app stopped or no app was running.
@echo off
echo Starting React app...
npm start