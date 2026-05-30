# Furqan quran-app-data Source

Mutqin prefers Furqan quran-app-data as the current trial i'rab source.

Download or clone:

```text
https://github.com/app-furqan/quran-app-data
```

Then place the relevant Furqan database or JSON data files somewhere under:

```text
data-sources/furqan/
```

Examples:

```text
data-sources/furqan/quran-app-data/...
data-sources/furqan/*.db
data-sources/furqan/*.sqlite
data-sources/furqan/*.json
```

The raw Furqan files are ignored by Git. Generate Mutqin's local static i'rab JSON with:

```bash
npm run inspect:furqan
npm run import:irab:furqan
```

Furqan quran-app-data is licensed CC BY-ND 4.0. Preserve the source text and provide attribution.
