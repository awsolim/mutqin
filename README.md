# Mutqin

Mutqin is a mobile-first Qur'an hifz companion app. The current product goal is to become a beautiful, accurate Madani mushaf reader first, then layer hifz tools such as audio repetition, Iʿrāb and grammar lookup, personal notes, and mutashabihat tracking.

## Current Phase

Library foundation:

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
- User-scoped Library items stored in Supabase
- Ayah Insight notes from the mushaf action bar
- Bookmark save/remove from selected ayat
- Library home with Qur'an Notes, Collections, and Biographies shelves
- Ayah Insights and Bookmarks Library pages
- Polished placeholder shelves for Surah Notes, Duas, Hadiths, Khutbahs, Seerah, and Companions
- Similar Verses / Mutashabihat Step 1 with manual ayah linking, word-range highlights, memory notes, and mushaf indicators
- Similar Verses Catalog seeded demo flows for `كَدَأْبِ آلِ فِرْعَوْنَ` and `يسير / يسيرا`
- User-scoped personal notes stored in the legacy notes table
- Ayah notes from the notes page
- Range notes for selected same-surah ranges
- Surah notes from the notes page or surah selector
- Notes page with search, type filters, edit, and delete
- Trial local Iʿrāb lookup from Furqan quran-app-data generated JSON
- Local Meaning popup with Quran Foundation Saheeh International translation
- Local study popups for Arabic tafsir
- Installable PWA manifest and icons
- Minimal service worker for static app assets
- Production build check for generated mushaf data

Qur'an text and mushaf layout data are generated locally under `lib/quran/generated` for fast normal reading without live API calls. `surahs.json` contains metadata, `pages/page-001.json` through `pages/page-604.json` contain page word/line data, `page-index.json` summarizes page ranges, and `surah-first-pages.json` maps each surah to its first mushaf page.

The mushaf reader does not perform a full route transition for every page turn. `/app/mushaf/[page]` provides the initial page, then a persistent client-side shell keeps nearby pages in memory, preloads adjacent QCF fonts, updates the URL with browser history, and slides pages like a mobile reader.

Supabase is used for auth and user-specific Library data. Do not store or fetch Qur'an text from Supabase. Qur'an text and mushaf layout remain local/generated data.

Generated mushaf data comes from Quran Foundation / Quran.com Content APIs using Mushaf 1, QCF V2 fields, and word-level `page_number` / `line_number` metadata. QCF V2 font files are loaded at runtime from the Quran Foundation CDN; they are not bundled locally. If those fonts cannot load, the reader falls back to QPC Hafs Unicode text stored in the generated JSON.

Audio playback uses ayah-level MP3 URLs configured in `lib/audio/reciters.ts`. Iʿrāb lookup prefers local generated Furqan quran-app-data sources and does not use Supabase. Translation and tafsir popups use local generated data. Similar Verses / Mutashabihat records are user-specific and stored in Supabase, while their Arabic previews are read from local mushaf data.

## Data Loading Architecture

Mutqin separates immutable Islamic source content from user-owned data:

- Static Qur'an and mushaf layout data lives under `lib/quran/generated`.
- Static translation data lives under `lib/translations/generated`.
- Static tafsir and Arabic study data lives under `lib/study/generated`.
- Static iʿrāb data lives under `lib/irab/generated`.
- Supabase stores only user-specific data: auth, bookmarks, ayah insights, notes, Library items, and Similar Verses records/highlights.
- Audio URLs are generated locally from `lib/audio/reciters.ts`; Supabase is not used for audio URL lookup.

Normal reading never calls Quran Foundation live and never stores Qur'an text, translations, tafsir, or iʿrāb in Supabase.

Runtime loading is intentionally narrow:

- `/app/quran` loads surah metadata and page-index metadata only.
- `/app/mushaf/[page]` server-loads the initial mushaf page only.
- The client mushaf shell preloads nearby pages through `/api/mushaf/pages/[page]`, which returns one generated page JSON file and uses immutable cache headers.
- Surah verse summaries are generated from indexed relevant pages only, cached in memory, and served with immutable cache headers.
- Meaning, tafsir, and iʿrāb sheets lazy-load generated data by surah/source through app API routes and cache results in browser memory.
- Bookmark markers fetch only bookmarks for the visible page.
- Similar Verses mushaf markers fetch only lightweight page links for the visible page.
- Full Similar Verses records and highlights load only when opening the Library record or the in-mushaf Similar Verses preview subpage.

Client/server boundaries:

- Server-only helpers in `lib/quran/utils.ts` read generated JSON from disk and must not be imported into client components.
- Client components receive only the current page, small metadata, or lazy-loaded per-surah/per-page payloads.
- Generated static API routes use long-lived cache headers. Authenticated Supabase routes use `no-store`.
- The `lib/user-library` boundary documents that user-specific modules are separate from static Qur'an/study data.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase `library_items` table with RLS
- Supabase Similar Verses tables with RLS
- Legacy Supabase notes table with RLS
- Quran Foundation Content APIs for generated local mushaf data
- Browser Audio API for ayah repetition
- npm

## Run Locally

```bash
npm install
npm run import:mushaf
npm run inspect:furqan # optional, requires Furqan files under data-sources/furqan
npm run import:irab:furqan # optional, generates preferred i'rab data
npm run import:study:quran-db # optional, generates Arabic meanings/tafsir from quran.db
npm run inspect:qf-translations # optional, lists Quran Foundation translation resources
npm run import:qf-translations # optional, generates local English translations
npm run inspect:qf-tafsirs # optional, lists Quran Foundation tafsir resources
npm run import:qf-tafsirs # optional, generates English Ibn Kathir Abridged
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

## Library Database

Apply the SQL in `supabase/migrations/002_library_items.sql` to your Supabase project. It creates `public.library_items`, enables row level security, and adds policies so users can only read, insert, update, and delete their own Library items.

Current implemented Library types:

- `ayah_insight`: created from the selected ayah Note action
- `bookmark`: created or removed from the selected ayah Bookmark action

Planned Library types are already represented in the data model for future shelves:

- `surah_note`
- `similar_verses`
- `dua`
- `hadith`
- `khutbah`
- `seerah`
- `companion`

Qur'an text is not stored in `library_items`. Bookmark and insight rows store references such as `verse_key`, surah number, ayah start/end, and page number. Arabic previews are read from local generated mushaf data when rendering Library pages.

The Library home at `/app/library` is organized into:

- Qur'an Notes: Ayah Insights, Surah Notes, Bookmarks, Similar Verses
- Collections: Duas, Hadiths, Khutbahs
- Biographies: Prophetic Seerah, Companions Biographies

## Similar Verses Database

Apply the SQL in `supabase/migrations/003_similar_verses.sql` to your Supabase project. It creates or upgrades:

- `similar_verse_sets`: one user-owned mutashabihat record
- `similar_verse_items`: the ayat attached to that record
- `similar_verse_highlights`: word-position ranges colored as shared wording, identity markers, outliers, endings, or memory clues

All three tables have RLS policies so users can only read, insert, update, and delete their own records.

Current Similar Verses Step 1 supports:

- Manually adding any number of ayat from local/generated Qur'an data
- Preventing duplicate ayat in the same record
- Word-range block highlighting for shared-by-all, shared-by-some, identity marker, outlier, ending family, ending outlier, and memory clue
- Optional title, family title, and memory note
- Record list at `/app/library/similar-verses`
- New record flow at `/app/library/similar-verses/new`
- Detail pages at `/app/library/similar-verses/[id]`
- Mushaf indicators for ayat linked to one or more Similar Verses records
- Note → Similar Verses from a selected mushaf ayah, prefilled with that ayah
- Demo flows at `/app/library/similar-verses/new?demo=dab` and `/app/library/similar-verses/new?demo=yasir`

Current limitations:

- Linking is manual only; there is no automatic similarity detection yet.
- Highlighting stores word positions from the current local mushaf data.
- Multi-page automatic range comparison is not implemented yet.
- Demo records are local prefilled drafts; save them while logged in to persist them to Supabase.

## Generate Iʿrāb Data

Mutqin prefers trial Iʿrāb data from Furqan quran-app-data.

1. Download or clone:

```text
https://github.com/app-furqan/quran-app-data
```

2. Place the relevant Furqan database or JSON files under:

```text
data-sources/furqan/
```

3. Inspect the available data:

```bash
npm run inspect:furqan
```

4. Import generated static JSON:

```bash
npm run import:irab:furqan
```

Generated Furqan data is written under:

```text
lib/irab/generated/sources/furqan-karbasi/
lib/irab/generated/sources/furqan-muyassar/
```

If both sources are generated, the Iʿrāb popup shows a simple source selector and defaults to Al-Karbasi. If only one source is generated, it shows that source.

Furqan quran-app-data is licensed CC BY-ND 4.0. Preserve the source text and provide attribution.

The older Abdallah-Mekky/Quran-Database importer remains available as a fallback trial importer:

```bash
npm run import:irab
```

It expects:

```text
data-sources/quran-database/quran.db
```

Generated Iʿrāb data is read locally through server helpers and exposed to the mushaf reader through an app API route. It is not stored in Supabase.

## Generate Study Data

Mutqin has local generated data layers for translations, meanings, and tafsir. Translation data is generated from Quran Foundation, not Supabase.

### Quran Foundation translations

Inspect currently available Quran Foundation translation resources:

```bash
npm run inspect:qf-translations
```

The importer prefers:

1. Saheeh/Sahih International
2. The Clear Quran / Dr. Mustafa Khattab
3. A reliable available English fallback

Run:

```bash
npm run import:qf-translations
```

Current generated translation source:

- Quran Foundation resource `20`: Saheeh International

The Clear Quran / Dr. Mustafa Khattab was not available in the current Quran Foundation translation resource list when last inspected.

Generated files are written under:

```text
lib/translations/generated/sources.json
lib/translations/generated/sources/qf-20-saheeh-international/
```

The mushaf ayah action bar includes a `Meaning` button. It loads local generated translation data lazily by surah and caches it in client memory. Translation data is not stored in Supabase and is not fetched live from Quran Foundation during normal reading.

On some Windows machines Node may fail Quran Foundation HTTPS requests with a local certificate-chain error. Fixing the local certificate store is preferred. For a one-time local import only, this workaround can unblock generation:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'; npm run inspect:qf-translations
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'; npm run import:qf-translations
```

### Quran Foundation tafsir

Inspect currently available Quran Foundation tafsir resources:

```bash
npm run inspect:qf-tafsirs
```

Current QF English tafsir source:

- Quran Foundation resource `169`: Ibn Kathir (Abridged)

Run:

```bash
npm run import:qf-tafsirs
```

Generated files are written under:

```text
lib/study/generated/tafsirs/qf-tafsir-169-ibn-kathir-abridged/
```

This English source is shown first in the Tafsir popup when available. Some ayat do not have a separate Ibn Kathir entry, so the Arabic tafsir sources remain available alongside it.

If needed on a local Windows machine with certificate-chain issues:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'; npm run inspect:qf-tafsirs
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'; npm run import:qf-tafsirs
```

### Quran-Database Arabic study data

Current generated Arabic study data includes content from `data-sources/quran-database/quran.db`:

- Arabic meanings from `maany_aya`
- Tafsir As-Saadi from `tafseer_saadi`
- Tafsir Al-Muyassar from `tafseer_moysar`
- Tafsir Al-Baghawi from `tafseer_bughiu`

Run:

```bash
npm run import:study:quran-db
```

Generated files are written under:

```text
lib/study/generated/meanings/
lib/study/generated/tafsirs/
```

The mushaf ayah action bar includes a `Tafsir` button. Tafsir loads local generated data lazily by surah and caches it in client memory.

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
5. Apply `supabase/migrations/001_notes.sql`, `supabase/migrations/002_library_items.sql`, and `supabase/migrations/003_similar_verses.sql` to the production Supabase project.
6. Deploy with the default Next.js build command:

```bash
npm run build
```

## Current Limitations

- The temporary PWA icon is a simple generated mark and should be replaced with final branding later.
- The service worker intentionally avoids offline caching for authenticated pages and Supabase data.
- Audio URLs depend on the configured external ayah-level MP3 sources.
- Iʿrāb depends on locally generated trial Furqan data; the importer is schema-tolerant but may need adjustment if Furqan changes file names or columns.
- Saheeh International translation and English Ibn Kathir Abridged tafsir are generated locally from Quran Foundation. The Clear Quran was not available through the inspected Quran Foundation resources.
- Ayah Insights, Bookmarks, and Similar Verses are the active Library item types.
- Similar Verses is manual-first; automatic mutashabihat detection is planned later.

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
- `/app/library/ayah-insights`
- `/app/library/surah-notes`
- `/app/library/bookmarks`
- `/app/library/similar-verses`
- `/app/library/similar-verses/new`
- `/app/library/similar-verses/[id]`
- `/app/library/duas`
- `/app/library/hadiths`
- `/app/library/khutbahs`
- `/app/library/seerah`
- `/app/library/companions`
- `/app/notes`
- `/app/mutashabihat`
- `/app/settings`

## Scripts

```bash
npm run import:mushaf
npm run inspect:furqan
npm run import:irab:furqan
npm run import:irab
npm run import:study:quran-db
npm run inspect:qf-translations
npm run import:qf-translations
npm run inspect:qf-tafsirs
npm run import:qf-tafsirs
npm run dev
npm run lint
npm run build
```

## Next Planned Phase

Next: Mutashabihat notebook.
