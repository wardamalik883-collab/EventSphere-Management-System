@echo off
title EventSphere Management System - Launcher
color 0A

echo ======================================================================
echo           Starting EventSphere Management System (MERN Stack)
echo ======================================================================
echo.
echo [1/2] Starting Backend Server on http://localhost:5000 ...
start "EventSphere Backend Server (:5000)" cmd /k "cd /d %~dp0server && npm start"

echo.
echo [2/2] Starting Frontend Client on http://localhost:3000 ...
start "EventSphere Frontend Client (:3000)" cmd /k "cd /d %~dp0client && npm start"

echo.
echo ======================================================================
echo Both Backend and Frontend servers are running in separate windows!
echo Your web browser will automatically open: http://localhost:3000
echo.
echo Demo Accounts for Testing:
echo   - Admin     : admin@eventsphere.demo     / AdminPass123!
echo   - Organizer : organizer@eventsphere.demo / OrganizerPass123!
echo   - Exhibitor : exhibitor@eventsphere.demo / ExhibitorPass123!
echo   - Attendee  : attendee@eventsphere.demo  / AttendeePass123!
echo ======================================================================
echo To stop the servers later, simply close both terminal windows.
echo ======================================================================
echo.
pause
