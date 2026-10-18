@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PORT=8788
title Wuhan Metro Line 8 - Next Train

where node >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:%PORT%"
  node server.js
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:%PORT%"
  echo 用 Python 启动（监听 0.0.0.0，局域网可访问）
  echo 本机地址: http://localhost:%PORT%
  ipconfig | findstr /i "IPv4"
  python -m http.server %PORT% --bind 0.0.0.0
  goto :eof
)

echo.
echo 未找到 Node.js / Python。
echo 也可以直接双击 index.html，但定位与局域网访问不可用。
echo.
pause
