# Mutqin

Mutqin is a mobile-first Qur'an hifz companion app. The current product goal is to become a beautiful, accurate Madani mushaf reader first, then layer hifz tools such as audio repetition, i'rab and grammar lookup, personal notes, and mutashabihat tracking.

## Current Phase

Launch/PWA preparation:

- Next.js App Router project setup
- TypeScript and Tailwind CSS
- Supabase Auth wiring
- Protected `/app` routes
- Mobile-first app shell with bottom navigation
- Full 114-surah selector at `/app/quran`
- Page-based mushaf reader at `/app/mushaf/[page]`
- Surah routes redirect to each surah's first mushaf page
- Local generated mushaf page JSON grouped by page line
- Client-side mushaf carousel that caches nearby pages and fonts
- Word-level DOM metadata for future ayah and word interactions
- Ayah long-press selection on mushaf pages
- Ayah-level audio playback from the mushaf action bar
- Reciter selection for Mishary Alafasy, Husary, and Minshawi
- Repeat controls for each ayah and current-page ranges
- Current-page range selection and range playback
- User-scoped personal notes stored in Supabase
- Ayah notes from the mushaf action bar
- Range notes for selected same-surah ranges
- Surah notes from the notes page or surah selector
- Notes page with search, type filters, edit, and delete
- Installable PWA manifest and icons
- Minimal service worker for static app assets
- Production build check for generated mushaf data

Qur'an text and mushaf layout data are generated locally under `lib/quran/generated` for fast normal reading without live API calls. `surahs.json` contains metadata, `pages/page-001.json` through `pages/page-604.json` contain page word/line data, `page-index.json` summarizes page ranges, and `surah-first-pages.json` maps each surah to its first mushaf page.

The mushaf reader does not perform a full route transition for every page turn. `/app/mushaf/[page]` provides the initial page, then a persistent client-side shell keeps nearby pages in memory, preloads adjacent QCF fonts, updates the URL with browser history, and slides pages like a mobile reader.

Supabase is used for auth and user-specific notes. Do not store or fetch Qur'an text from Supabase. Qur'an text and mushaf layout remain local/generated data.

Generated mushaf data comes from Quran Foundation / Quran.com Content APIs using Mushaf 1, QCF V2 fields, and word-level `page_number` / `line_number` metadata. QCF V2 font files are loaded at runtime from the Quran Foundation CDN; they are not bundled locally. If those fonts cannot load, the reader falls back to QPC Hafs Unicode text stored in the generated JSON.

Audio playback uses ayah-level MP3 URLs configured in `lib/audio/reciters.ts`. I'rab data and mutashabihat tracking are not implemented yet.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase notes table with RLS
- Quran Foundation Content APIs for generated local mushaf data
- Browser Audio API for ayah repetition
- npm

## Run Locally

```bash
npm install
npm run import:mushaf
npm run lint
npm run build
npm run dev
```

Then open `http://localhost:3000`.

## Environment Variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
QF_ENV=production
QF_CLIENT_ID=your-quran-foundation-client-id
QF_CLIENT_SECRET=your-quran-foundation-client-secret
```

Authentication pages show a configuration notice if Supabase values are missing.

`QF_CLIENT_ID` and `QF_CLIENT_SECRET` are server-only. Never prefix them with `NEXT_PUBLIC_`.

For Vercel, configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `QF_ENV`
- `QF_CLIENT_ID`
- `QF_CLIENT_SECRET`

`QF_*` values are only used by import/server tooling and must not be exposed to client code.

## Generate Mushaf Data

```bash
npm run import:mushaf
```

The import script authenticates with Quran Foundation from the server, fetches Mushaf 1 pages 1-604, groups words by line, and writes local JSON files under `lib/quran/generated`.

Generated mushaf data is required at runtime and should be committed or otherwise present before building. `npm run build` runs `scripts/verify-generated-data.mjs` first and fails with a clear message if required generated data is missing.

On some Windows machines Node may fail Quran Foundation HTTPS requests with a local certificate-chain error. Fixing the local certificate store is preferred. For a one-time local import only, this workaround can unblock generation:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'; npm run import:mushaf
```

## Notes Database

Apply the SQL in `supabase/migrations/001_notes.sql` to your Supabase project. It creates `public.notes`, enables row level security, and adds policies so users can only read, insert, update, and delete their own notes.

Qur'an text is not stored in this table. Notes only store user-authored title/body content plus references such as surah number, ayah start/end, and page number.

## PWA Install

Mutqin includes `app/manifest.ts`, generated icons in `public/icons`, and a conservative service worker at `public/sw.js`.

On iPhone:

1. Open the deployed site in Safari.
2. Sign in.
3. Tap Share.
4. Tap Add to Home Screen.

On Android:

1. Open the deployed site in Chrome.
2. Sign in.
3. Use Install app or Add to Home screen from the browser menu.

The service worker caches static assets such as icons, the manifest, and Next static chunks. It does not cache authenticated Supabase data, API responses, or dynamic page navigations.

## Deploy to Vercel

1. Ensure generated mushaf data exists locally:

```bash
npm run import:mushaf
```

2. Commit the generated data under `lib/quran/generated` or make sure your deployment process generates it before `npm run build`.
3. Add the required environment variables in Vercel Project Settings.
4. In Supabase Auth settings, add your production Vercel URL to allowed redirect/site URLs.
5. Apply `supabase/migrations/001_notes.sql` to the production Supabase project.
6. Deploy with the default Next.js build command:

```bash
npm run build
```

## Current Limitations

- The temporary PWA icon is a simple generated mark and should be replaced with final branding later.
- The service worker intentionally avoids offline caching for authenticated pages and Supabase data.
- Audio URLs depend on the configured external ayah-level MP3 sources.
- Notes are basic hifz journal entries; foldered library organization is planned later.
- Mutashabihat tracking is not implemented yet.

## Routes

Public:

- `/`
- `/login`
- `/signup`

Protected:

- `/app`
- `/app/quran`
- `/app/quran/[surahNumber]`
- `/app/mushaf/[page]`
- `/app/audio`
- `/app/library`
- `/app/notes`
- `/app/mutashabihat`
- `/app/settings`

## Scripts

```bash
npm run import:mushaf
npm run dev
npm run lint
npm run build
```

## Next Planned Phase

Next: Mutashabihat notebook.
