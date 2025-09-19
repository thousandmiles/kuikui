/**
 * Environment setup script for kuikui
 * Ensures .env files are properly configured before starting the application
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const repoRoot = path.resolve(__dirname, '..');
const locations = [
  { name: 'root',     dir: repoRoot },
  { name: 'backend',  dir: path.join(repoRoot, 'backend') },
  { name: 'frontend', dir: path.join(repoRoot, 'frontend') },
];

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return {};
  try {
    return dotenv.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.warn(`Could not parse ${filepath}: ${e.message}`);
    return {};
  }
}

function writeEnvFile(filepath, dataObj) {
  const lines = Object.entries(dataObj).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(filepath, lines.join('\n') + '\n', 'utf8');
}

function ensureAndMerge({ name, dir }) {
  const templatePath = path.join(dir, '.env.example');
  const targetPath   = path.join(dir, '.env');

  if (!fs.existsSync(dir)) {
    console.log(`[skip] ${name}: directory does not exist (${dir})`);
    return;
  }

  if (!fs.existsSync(templatePath)) {
    console.log(`[warn] ${name}: no .env.example found (${templatePath})`);
    return;
  }

  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(templatePath, targetPath);
    console.log(`[create] ${name}: created .env from .env.example`);
    return;
  }

  // Merge new keys
  const templateVars = loadEnvFile(templatePath);
  const currentVars  = loadEnvFile(targetPath);

  const missingKeys = Object.keys(templateVars).filter(k => !(k in currentVars));

  if (missingKeys.length === 0) {
    console.log(`[ok] ${name}: .env up to date`);
    return;
  }

  // Append missing keys with template values
  let appended = '';
  missingKeys.forEach(k => {
    currentVars[k] = templateVars[k];
    appended += `  + ${k}\n`;
  });

  writeEnvFile(targetPath, currentVars);
  console.log(`[merge] ${name}: added missing keys:\n${appended.trimEnd()}`);
}

function main() {
  console.log('--- Environment Setup Start ---');
  console.log(`Repo root resolved to: ${repoRoot}\n`);

  locations.forEach(ensureAndMerge);

  console.log('\nEnvironment setup complete.');
  console.log('--------------------------------');
}

main();
