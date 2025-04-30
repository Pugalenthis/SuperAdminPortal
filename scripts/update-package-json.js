import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Read the current package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add new scripts for MongoDB
packageJson.scripts = {
  ...packageJson.scripts,
  "dev:mongo": "NODE_ENV=development tsx server/mongoIndex.ts",
  "build:mongo": "vite build && esbuild server/mongoIndex.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start:mongo": "NODE_ENV=production node dist/mongoIndex.js",
  "migrate:mongo": "tsx scripts/migrate-to-mongodb.ts",
  "check:mongo": "tsc"
};

// Write the updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ package.json updated with MongoDB scripts');