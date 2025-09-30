@echo off
title MP4 Merger Server
echo Starting MP4 Merger...
echo.
echo Server will start on http://localhost:5000
echo Browser will open automatically
echo.
echo Press Ctrl+C to stop the server
echo.

start http://localhost:5000
node server.js