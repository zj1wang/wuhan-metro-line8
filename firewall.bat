@echo off
chcp 65001 >nul
setlocal
set PORT=8788
set RULE=Wuhan Metro Line 8 %PORT%

net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo 需要管理员权限，正在请求提权...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" >nul 2>&1
  exit /b
)

echo.
echo 正在放行 TCP %PORT%（仅专用网络）...
netsh advfirewall firewall delete rule name="%RULE%" >nul 2>&1
netsh advfirewall firewall add rule name="%RULE%" dir=in action=allow protocol=TCP localport=%PORT% profile=private

echo.
echo 完成。手机与电脑连同一个 WiFi 后，打开 http://本机IP:%PORT% 即可。
echo 手机上定位会被浏览器禁用（http 页面），手动点选车站即可。
echo.
echo 撤销放行： netsh advfirewall firewall delete rule name="%RULE%"
echo.
pause
