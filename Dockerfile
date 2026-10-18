# 纯静态页面 + 一个只用 Node 内置模块的静态服务器，无需安装依赖
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8788 \
    HOST=0.0.0.0

COPY package.json ./
COPY index.html style.css app.js data.js server.js ./

# 兜底：源文件若带 700 之类的权限会被 COPY 原样带入镜像，
# 而非 root 的 node 用户将无法读取，这里统一放宽为可读
RUN chmod -R a+rX /app

EXPOSE 8788

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8788/ > /dev/null || exit 1

USER node

CMD ["node", "server.js"]
