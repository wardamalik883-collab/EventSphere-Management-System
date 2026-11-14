@echo off
title Stop EventSphere Servers
color 0C
echo ======================================================================
echo           Stopping EventSphere Management System Servers
echo ======================================================================
echo.
echo Stopping processes running on ports 5000 and 3000...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
  taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
  taskkill /f /pid %%a >nul 2>&1
)

echo.
echo All EventSphere servers on ports 5000 and 3000 have been stopped!
echo.
pause
