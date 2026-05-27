import fs from "node:fs";
import path from "node:path";

const generatedDir = path.join(process.cwd(), "lib", "quran", "generated");
const requiredFiles = [
  path.join(generatedDir, "surahs.json"),
  path.join(generatedDir, "page-index.json"),
  path.join(generatedDir, "surah-first-pages.json"),
  path.join(generatedDir, "pages", "page-001.json"),
  path.join(generatedDir, "pages", "page-604.json"),
];

const missingFiles = requiredFiles.filter((filePath) => !fs.existsSync(filePath));

if (missingFiles.length > 0) {
  console.error("Missing generated mushaf data required for production builds.");
  console.error("Run `npm run import:mushaf` before building or deploying.");
  for (const filePath of missingFiles) {
    console.error(`- ${path.relative(process.cwd(), filePath)}`);
  }
  process.exit(1);
}

console.log("Generated mushaf data found.");
