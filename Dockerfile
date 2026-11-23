# NUTRANTARA — server kelas (game 3D + panel guru)
FROM node:20-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    NUTRANTARA_DATA_DIR=/data
WORKDIR /app
# su-exec: menjalankan server sebagai user "node" setelah kepemilikan folder data dibereskan.
RUN apk add --no-cache su-exec
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
RUN mkdir -p /data && chown -R node:node /data
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
# Disk permanen (mis. Render) dipasang saat kontainer berjalan dan bisa dimiliki root, sehingga chown di atas
# tidak berlaku untuknya. Kontainer mulai sebagai root hanya untuk menyerahkan folder data ke user "node",
# lalu server berjalan sebagai "node" (bukan root). Bila kontainer sudah dijalankan sebagai user lain, langsung jalan.
ENTRYPOINT ["sh", "-c", "if [ \"$(id -u)\" = 0 ]; then mkdir -p \"$NUTRANTARA_DATA_DIR\" && chown -R node:node \"$NUTRANTARA_DATA_DIR\" 2>/dev/null || true; exec su-exec node \"$@\"; fi; exec \"$@\"", "--"]
CMD ["node", "server.js"]
