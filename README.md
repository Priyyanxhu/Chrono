# ORION — AI Powered Missing Person Identification & Matching

> **Every missing person deserves to be found.** ORION uses facial recognition + GAN age progression to match lost & found persons — even if 4, 7, or 10 years have passed.

![ORION](https://img.shields.io/badge/AI-Face%20Recognition-teal) ![Age Progression](https://img.shields.io/badge/AI-Age%20Progression-violet) ![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20Sharp-slate)

---

## ✨ Features

### For Families (Report Lost)
- Upload **many photos (up to 8 per report, unlimited via gallery)** + details: name, age at missing, gender, last seen location/date, marks, contact
- **Automatic AI Age Progression** per photo if missing ≥2 years — generates current-age projection for each
- Instant matching against all found-person records (best similarity across all photos)
- Preview age progression before submitting (single or multi preview)

### For Citizens / NGOs / Police (Report Found)
- Upload **many photos (up to 8)** of unidentified person + estimation
- System scans all missing records with multi-factor scoring (best-of N×M)

### AI Engine
- **128-D Face Embedding** (simulated InsightFace / FaceNet — swap to real Python service)
- **Cosine similarity** + age / gender / location weighting
- **Age-adjusted matching**: compensates for years missing (boost when progression used)
- **Explainable breakdown**: face 60% + age/gender 20% + location 10% + time 10%

### Age Progression
- If `yearsMissing = floor((today - lastSeenDate)/365)` ≥2, backend calls `sharp` morph (placeholder for **HRFAE / SAM / Replicate**)
- Returns `imageBase64`, targetAge, confidence, description
- On-demand regeneration for existing cases

### Galleries & Matches
- Lost / Found galleries with search + gender filter — cards show stacked photos + count badge (`3 photos`)
- Live **AI Matches** page ranked by confidence (Very High ≥85, High ≥70, Possible ≥50) — shows `3×2 photos → best face` badge + thumbnail strips
- Detail pages with **gallery carousel** (add/delete, set primary, per-photo aging), original vs aged comparison per photo + top-5 matches + per-factor bars
- Status & contact directly from detail view
- SQLite persists every report + every photo forever (many per person, many persons)

---

## 🏗 Architecture

```
ORION/
├── backend/               # Node + Express + SQLite
│   ├── server.js          # REST API + static uploads
│   ├── db.js              # SQLite (node:sqlite) — 4 tables, WAL
│   ├── utils/
│   │   ├── matching.js    # embedding + cosine + scoring (multi-photo max)
│   │   └── ageProgression.js # sharp-based morph (replace with GAN)
│   ├── data/
│   │   ├── ORION.db        # SQLite DB (WAL) — primary store
│   │   ├── ORION.db-wal
│   │   ├── lost.json      # legacy JSON (migrated to DB on first run)
│   │   └── found.json     # legacy JSON
│   └── uploads/           # image storage (many per person, up to 8/request)
└── frontend/              # Vite + React + Tailwind + React Router
    ├── src/
    │   ├── pages/
    │   │   ├── Home.jsx          # hero + stats + how-it-works
    │   │   ├── ReportLost.jsx    # multi-photo (up to 8, primary, preview)
    │   │   ├── ReportFound.jsx   # multi-photo
    │   │   ├── Lost.jsx / Found.jsx
    │   │   ├── Matches.jsx       # best-of N×M
    │   │   └── PersonDetail.jsx  # gallery, add/delete, primary, aging per photo
    │   ├── components/
    │   │   └── PersonCard.jsx    # stacked photos, count badge
    │   └── utils/api.js
    └── vite.config.js     # proxies /api → :5000
```

### Database — SQLite `data/ORION.db` (new)
**4 tables** (migrates from JSON automatically, WAL mode, foreign keys):
- `lost_persons` (id, name, age, gender, lastSeenLocation, lastSeenDate, yearsMissing, description, contactName/Phone/Email, hasAgeProgressed, status, createdAt)
- `lost_photos` (id, person_id FK CASCADE, url, embedding JSON[128], ageProgressedImage TEXT (base64), ageProgressionMeta JSON, is_primary, sort_order, createdAt)
- `found_persons` (id, name, estimatedAge, gender, foundLocation, foundDate, description, reporterName/Phone, status, createdAt)
- `found_photos` (id, person_id FK, url, embedding JSON, is_primary, sort_order, createdAt)

**Many images**: each person can have many photos (API enforces 8 per request, but DB supports unlimited via repeated `POST /:id/photos`). Matching uses `maxCosineSimilarity` across all `N×M` embedding pairs → best face wins. Total photos shown in `/api/stats` (`totalLostPhotos`, `totalFoundPhotos`). Inspect via `node:sqlite` or `sqlite3` / DB Browser.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### 1) Install
```bash
# backend
cd backend && npm install

# frontend
cd ../frontend && npm install

# root (optional concurrent)
cd .. && npm install
```

### 2) Run

**Two terminals:**
```bash
# terminal 1 — backend on http://localhost:5000
cd backend
npm run dev

# terminal 2 — frontend on http://localhost:5173
cd frontend
npm run dev
```

**Or single command from root:**
```bash
npm run dev
```

Frontend proxies `/api` and `/uploads` to backend — no CORS needed in dev.

### 3) Build
```bash
cd frontend && npm run build
# serve dist via any static host; keep backend on :5000
```

---

## 🔌 API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | health + `db: sqlite` |
| `GET` | `/api/stats` | counts, highMatches, `totalLostPhotos`/`totalFoundPhotos` |
| `GET` | `/api/db/info` | DB path, tables, stats |
| `GET` | `/api/photos` | all photos (100) from DB |
| `GET` | `/api/lost?search=&gender=` | list lost (SQLite, `imageUrls`, `embeddings`) |
| `GET` | `/api/found?search=` | list found |
| `GET` | `/api/lost/:id` / `/api/found/:id` | detail with `photos[]`, `photoCount` |
| `POST` | `/api/lost` | multipart: `photos` (1-8) + fields → auto age-progress per photo → SQLite |
| `POST` | `/api/found` | multipart: `photos` (1-8) + fields → SQLite |
| `POST` | `/api/lost/:id/photos` | append photos (1-8) to existing lost |
| `POST` | `/api/found/:id/photos` | append photos to found |
| `DELETE` | `/api/lost/:id/photos/:idx` / `found` | delete specific photo (by index) |
| `PATCH` | `/api/lost/:id/photos/primary` | `{index}` set primary |
| `POST` | `/api/age-progress` | standalone preview (supports `photos` multiple → `{multiple:true, results}`) |
| `POST` | `/api/age-progress/:id?photoIndex=0` | regenerate for existing lost photo idx |
| `POST` | `/api/age-progress-all/:id` | regenerate all photos |
| `GET` | `/api/match/lost/:id` | matches for lost (best-of N×M) |
| `GET` | `/api/match/found/:id` | matches for found |
| `GET` | `/api/matches?threshold=50` | all pairs ≥ threshold (`photoCount`, `imageUrls`) |
| `PATCH` | `/api/lost/:id/status` | {status} |
| `DELETE` | `/api/lost/:id` | delete person (CASCADE photos) |

---

## 🧠 Production Swaps

- **Face embeddings**: replace `generateEmbedding()` in `backend/utils/matching.js` with a Python microservice (InsightFace / dlib) called via HTTP or `onnxruntime-node`.
- **Age progression**: replace `generateAgeProgressedImage()` with a call to Replicate `yuval-alaluf/SAM` or self-hosted HRFAE/GFPGAN. Current `sharp` morph is a realistic placeholder that preserves demo without GPU.
- **DB**: SQLite `ORION.db` already handles many persons × many photos (WAL, CASCADE). For horizontal scale, swap to Postgres + `pgvector` / Mongo — keep embedding as `vector(128)`, photos as separate table (current schema maps 1:1). Current `db.js` uses `node:sqlite` (Node 24 built-in, no native deps).
- **Storage**: move `uploads/` to S3 / Cloudinary; store `imageUrl` as CDN URL (DB keeps URL).
- **Auth**: add JWT + OTP for reporters; audit log for contact disclosure.
- **Inspect DB**: `sqlite3 data/ORION.db "SELECT name, age FROM lost_persons;"` or DB Browser for SQLite. JS: `node -e "import {DatabaseSync} from 'node:sqlite'; const db=new DatabaseSync('backend/data/ORION.db'); console.log(db.prepare('SELECT COUNT(*) as c FROM lost_photos').get())"`

---

## 🎨 Design

- **Palette**: slate-950 / teal-600 / cyan-600 / amber-500 / violet-600
- **Fonts**: Outfit (display) + Inter (body)
- **Tone**: urgent yet hopeful — "AI Reunite"

---

## 📸 Demo Flow

1. **Home** → see stats & live match card.
2. **Report Lost** → pick photo, set lastSeenDate 4 years ago → **Preview AI Age Progression** → Submit → generated aged image stored.
3. **Report Found** → upload photo of same person today → submit.
4. **AI Matches** → pair appears top-ranked (e.g., 94% Very High).
5. **Detail view** → original vs aged side-by-side + breakdown bars + contact.



---

## ⚠️ Ethics & Safety

- Matches require **human verification**; never contact without NGO/police mediation.
- Upload only with consent/rights; photos are sensitive personal data.
- Age projection is an **estimate**, explicitly disclaimer-ed.

---

## 📄 License

MIT — for educational / NGO use.
