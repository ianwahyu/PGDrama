# PGDrama SPlay Web

Web katalog dan player SPlay yang dibuat ringan untuk VPS kecil: Astro SSR, Tailwind CSS, SQLite cache bawaan Node, dan localStorage untuk favorit/history.

## Fitur V1

- Katalog mobile-first untuk drama, anime, MovieBox, iQIYI, WeTV, DrakorIndo, dan Baca.
- Search, pagination, detail konten, episode list, video player, dan reader manga ringan.
- API key SPlay tetap server-only melalui env.
- Cache metadata memakai SQLite agar hemat rate limit.
- Favorit dan history tersimpan lokal di browser tanpa login.

## Setup Lokal

Butuh Node.js `>=22.5.0` karena cache memakai SQLite bawaan Node.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Isi `.env.local`:

```bash
SPLAY_API_KEY=replace_with_your_api_key
SPLAY_BASE_URL=https://api.splay.id
CACHE_DB_PATH=.cache/splay-cache.db
CACHE_TTL_SECONDS=600
```

## Build

```bash
npm run build
npm run preview
```

Build menghasilkan server standalone Astro di `dist/server/entry.mjs`.

## Catatan Ringan

- Halaman katalog hampir tanpa JavaScript.
- Script player kecil; `hls.js` dipisah sebagai dynamic chunk dan hanya dimuat jika browser tidak mendukung HLS native.
- Jangan commit `.env.local` atau API key.
