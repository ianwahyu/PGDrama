# Deployment VPS 1 GB RAM

Panduan ini memakai satu proses Node.js standalone dan reverse proxy Caddy/Nginx.

Gunakan Node.js `>=22.5.0`.

## 1. Install

```bash
npm ci --omit=dev
npm run build
```

Pastikan env production tersedia:

```bash
SPLAY_API_KEY=replace_with_your_api_key
SPLAY_BASE_URL=https://api.splay.id
CACHE_DB_PATH=/var/lib/pgdrama/splay-cache.db
CACHE_TTL_SECONDS=600
HOST=127.0.0.1
PORT=4321
```

## 2. Systemd

Contoh service:

```ini
[Unit]
Description=PGDrama SPlay Web
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/pgdrama
EnvironmentFile=/etc/pgdrama.env
ExecStart=/usr/bin/node dist/server/entry.mjs
Restart=always
RestartSec=5
MemoryMax=650M
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pgdrama
sudo systemctl status pgdrama
```

## 3. Caddy

```caddyfile
domainkamu.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:4321
}
```

## 4. Nginx Alternatif

```nginx
server {
  listen 80;
  server_name domainkamu.com;

  location / {
    proxy_pass http://127.0.0.1:4321;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 5. Maintenance Cache

```bash
npm run cache:prune
```

Jalankan berkala via cron jika traffic tinggi.
