/**
 * 极简静态服务器（仅用 Node 内置模块，无依赖）
 * 用途：让浏览器在 http://localhost 下打开页面（启用定位），同时监听 0.0.0.0，
 *       使同一局域网内的手机 / 平板也能用本机 IP 访问。
 *
 * 用法：
 *   node server.js                       默认端口 8788，监听全部网卡
 *   set PORT=8790 & node server.js       换端口
 *   set HOST=127.0.0.1 & node server.js  只允许本机访问
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8788;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

/* 取本机所有局域网 IPv4 地址 */
function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(function (name) {
    (ifaces[name] || []).forEach(function (info) {
      if (info.family === 'IPv4' && !info.internal) {
        out.push({ name: name, address: info.address });
      }
    });
  });
  return out;
}

/* 把 ::ffff:192.168.1.5 这类地址规整成 192.168.1.5 */
function cleanIp(ip) {
  return String(ip || '').replace(/^::ffff:/, '');
}

function logAccess(req) {
  const ip = cleanIp(req.socket.remoteAddress);
  const local = /^127\.|^::1$/.test(ip);
  const p = req.url.split('?')[0];
  console.log('  ' + (local ? '本机' : '局域网 ' + ip).padEnd(20) + ' ' + p);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  logAccess(req);

  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.log('');
    console.log('  端口 ' + PORT + ' 已被占用，换个端口再试：');
    console.log('  set PORT=8790 && node server.js');
    console.log('');
  } else {
    console.log('  启动失败：' + err.message);
  }
});

server.listen(PORT, HOST, function () {
  const lan = lanAddresses();

  console.log('');
  console.log('  武汉地铁 8号线 · 发车看板');
  console.log('  ─────────────────────────────');
  console.log('  本机访问   http://localhost:' + PORT + '     （可直接定位）');

  if (HOST === '0.0.0.0') {
    if (lan.length) {
      console.log('');
      console.log('  同一 WiFi 下的手机 / 平板：');
      lan.forEach(function (n) {
        console.log('             http://' + n.address + ':' + PORT + '     (' + n.name + ')');
      });
      console.log('  （手机上浏览器不许在 http 页面定位，手动点选车站即可，会自动记住）');
    } else {
      console.log('');
      console.log('  未检测到局域网地址，请确认已连接 WiFi 或网线');
    }
  } else {
    console.log('  仅本机可访问（HOST=' + HOST + '）');
  }

  console.log('');
  console.log('  手机打不开时：以管理员身份运行 firewall.bat 放行 TCP ' + PORT + '。');
  console.log('  按 Ctrl+C 退出');
  console.log('');
});
