# Quran-Database Source

Place the Abdallah-Mekky/Quran-Database SQLite file here as:

```text
data-sources/quran-database/quran.db
```

The raw database is intentionally ignored by Git. Run:

```bash
npm run import:irab
```

to generate local static i'rab JSON under `lib/irab/generated`.
