# PGDrama SPlay Web

Web katalog dan player SPlay yang dibuat ringan untuk VPS kecil: Astro SSR, Tailwind CSS, SQLite cache bawaan Node, dan localStorage untuk favorit/history.

## Fitur Utama & UI/UX

- **Dark & Light Mode**: Desain modern menggunakan palet *Soft Blue* dengan aksen *Soft Pink* & *Soft Yellow*. Menyimpan preferensi tema secara otomatis.
- **Hero Carousel**: Menampilkan drama trending di halaman utama menggunakan fitur scroll yang responsif.
- **Smart Search Auto-suggest**: Fitur pencarian instan dengan suguhan *dropdown* hasil secara dinamis.
- **Binge-Watching Player**: Navigasi *Episode Selanjutnya* dan *Sebelumnya* yang menyatu dengan daftar episode di halaman *player*.
- **Micro-Interactions**: Efek *hover* elegan pada poster dengan *Play Button* overlay dan fitur *Skeleton Loading/Shimmer* untuk pengalaman yang mulus.
- **Backend Ringan & Aman**: API key SPlay tetap server-only melalui env. Cache metadata memakai SQLite agar hemat rate limit. Favorit dan history tersimpan lokal di browser tanpa login.

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
