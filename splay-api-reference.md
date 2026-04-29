# SPlay API Reference

Base URL: `https://api.splay.id`

Authentication: `Authorization: Bearer YOUR_API_KEY`

Get your API key at [hub.splay.id/api-dashboard](https://hub.splay.id/api-dashboard)

---

## Content Types

| Slug | Label | Type | Plans |
|------|-------|------|-------|
| dramas | Short Drama | Video | Free+ (480p) |
| anime | Anime | Video | Pro+ (HLS) |
| moviebox | MovieBox | Video | Pro+ (HLS) |
| iqiyi | iQIYI | Video | Pro+ (1080p) |
| wetv | WeTV | Video | Pro+ (1080p) |
| drakor | DrakorIndo | Video | Enterprise+ (1080p) |
| baca | Baca (Manga) | Reading | Enterprise+ |

All plans get metadata access (listing, search, detail) to all 7 APIs. Signed video/chapter URLs require the plan listed above.

---

## Public Endpoints (No Auth)

```
GET /health                    → { status: "ok" }
GET /api/status                → Provider stats, totals
GET /api/content-types         → Enabled content types
GET /api/metrics/rps           → Real-time RPS metrics
```

---

## Short Drama API

```
GET /api/dramas                → List dramas (paginated)
GET /api/dramas/popular        → Popular by play_count
GET /api/dramas/trending       → Trending dramas
GET /api/dramas/{id}           → Drama detail + tags
GET /api/dramas/{id}/episodes  → Episodes with signed video URLs
GET /api/dramas/alphabet       → A-Z letter counts
GET /api/search?q=             → Full-text search (MeiliSearch)
GET /api/providers             → Provider list
GET /api/tags                  → Tag/genre list
```

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| page | int | Page number (default: 1) |
| per_page | int | Items per page (default: 20, max: 100) |
| provider | string | Filter by provider slug |
| tag | string | Filter by tag name |
| language | string | Filter by language (en, id, zh, ko, etc.) |
| sort_by | string | updated_at, play_count, title, chapter_count, created_at |
| sort_order | string | asc, desc |

---

## Anime API

```
GET /api/anime                          → List anime
GET /api/anime/popular                  → Popular anime
GET /api/anime/latest-update            → Recently updated
GET /api/anime/search?q=               → Search anime
GET /api/anime/genres                   → Genre list
GET /api/anime/alphabet                 → A-Z counts
GET /api/anime/{id}                     → Anime detail (AniList metadata)
GET /api/anime/{id}/episodes            → Episode list
GET /api/anime/{id}/episodes/{number}   → Single episode (HLS signed URLs + subtitles)
```

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| origin | string | JP, CN, KR |
| genre | string | Filter by genre |
| sort_by | string | updated_at, score, popularity |

---

## MovieBox API

```
GET /api/moviebox                       → List (movies or series)
GET /api/moviebox/popular               → Popular
GET /api/moviebox/trending              → Trending
GET /api/moviebox/search?q=            → Search
GET /api/moviebox/{id}                  → Detail (TMDB enriched)
GET /api/moviebox/{id}/episodes         → Episodes with signed URLs
GET /api/moviebox/alphabet              → A-Z counts
```

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| type | string | movies, series |

---

## iQIYI API

```
GET /api/iqiyi           → List
GET /api/iqiyi/popular   → Popular
GET /api/iqiyi/trending  → Trending
GET /api/iqiyi/search?q= → Search
GET /api/iqiyi/{id}      → Detail
GET /api/iqiyi/{id}/episodes → Episodes
```

---

## WeTV API

```
GET /api/wetv           → List
GET /api/wetv/popular   → Popular
GET /api/wetv/trending  → Trending
GET /api/wetv/search?q= → Search
GET /api/wetv/{id}      → Detail
GET /api/wetv/{id}/episodes → Episodes
```

---

## DrakorIndo API

```
GET /api/drakor           → List (type=series|movie)
GET /api/drakor/popular   → Popular
GET /api/drakor/trending  → Trending
GET /api/drakor/search?q= → Search
GET /api/drakor/{id}      → Detail
GET /api/drakor/{id}/episodes → Episodes
GET /api/drakor/alphabet  → A-Z counts
```

---

## Baca API (Manga/Manhwa/Manhua)

Categories: `manga`, `manhwa`, `manhua`

```
GET /api/baca/{category}                    → List
GET /api/baca/{category}/popular            → Popular
GET /api/baca/{category}/trending           → Trending
GET /api/baca/{category}/search?q=         → Search
GET /api/baca/{category}/{id}               → Detail
GET /api/baca/{category}/{id}/chapters      → Chapters with signed image URLs
GET /api/baca/{category}/alphabet           → A-Z counts
```

---

## Response Format

All endpoints return:

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 1234,
    "total_pages": 62
  }
}
```

Detail endpoints return:

```json
{
  "data": {
    "drama": { ... },
    "tags": [ ... ]
  }
}
```

---

## Rate Limits

| Plan | RPM | Daily | Quality |
|------|-----|-------|---------|
| Free | 30 | 43,200 | 480p |
| Basic | 120 | 172,800 | 480p |
| Advanced | 240 | 345,600 | 720p |
| Pro | 480 | 691,200 | 1080p |
| Enterprise | 960 | 1,382,400 | HLS |
| Elite | 1,920 | 2,764,800 | HLS |
| Ultimate | 5,760 | 8,294,400 | HLS |

Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` (on 429).

---

## Signed URLs

All video/image URLs are HMAC-SHA256 signed with a TTL:
- Default: 30 minutes
- Max: 4 hours (via `?expires_in=14400`)

Expired URLs return 403 from the CDN worker.

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| NotFound | 404 | Resource not found |
| BadRequest | 400 | Invalid parameters |
| Unauthorized | 401 | Missing or invalid API key |
| Forbidden | 403 | Access denied |
| RateLimited | 429 | Rate limit exceeded |
| UpgradeRequired | 402 | Plan upgrade needed |
| ContentTypeDisabled | 503 | Content type is disabled |
| ContentNotInPlan | 403 | Content type not in your plan |

---

*Generated from hub.splay.id — SPlay API v1.0*
