/**
 * Environment setup script for kuikui
 * Reads from root .env file and distributes values to backend and frontend .env files
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const repoRoot = path.resolve(__dirname, '..');

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return {};
  try {
    return dotenv.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.warn(`Could not parse ${filepath}: ${e.message}`);
    return {};
  }
}

function writeEnvFile(filepath, dataObj, header = '') {
  const lines = [];
  if (header) {
    lines.push(header);
    lines.push('');
  }
  lines.push(...Object.entries(dataObj).map(([k, v]) => `${k}=${v}`));
  fs.writeFileSync(filepath, lines.join('\n') + '\n', 'utf8');
}

function createBackendEnv(rootEnv) {
  const backendDir = path.join(repoRoot, 'backend');
  const backendEnvPath = path.join(backendDir, '.env');
  
  if (!fs.existsSync(backendDir)) {
    console.log('[skip] backend: directory does not exist');
    return;
  }

  // Backend needs these variables
  const backendVars = {
    NODE_ENV: rootEnv.NODE_ENV || 'development',
    BACKEND_PORT: rootEnv.BACKEND_PORT || '3001',
    BACKEND_HOST: rootEnv.BACKEND_HOST || 'localhost',
    BACKEND_URL: rootEnv.BACKEND_URL || 'http://localhost:3001',
    API_BASE_URL: rootEnv.API_BASE_URL || 'http://localhost:3001/api',
    WEBSOCKET_URL: rootEnv.WEBSOCKET_URL || 'http://localhost:3001',
    CORS_ORIGIN: rootEnv.CORS_ORIGIN || 'http://localhost:5173',
    ROOM_EXPIRY_HOURS: rootEnv.ROOM_EXPIRY_HOURS || '24',
    ROOM_CAPACITY: rootEnv.ROOM_CAPACITY || '150'
  };

  const header = '# Backend Environment Configuration for kuikui\n# Generated from root .env file by env-setup.js';
  writeEnvFile(backendEnvPath, backendVars, header);
  console.log('[create] backend: .env file updated with root values');
}

function createFrontendEnv(rootEnv) {
  const frontendDir = path.join(repoRoot, 'frontend');
  const frontendEnvPath = path.join(frontendDir, '.env');
  
  if (!fs.existsSync(frontendDir)) {
    console.log('[skip] frontend: directory does not exist');
    return;
  }

  // Frontend needs these variables (including VITE_ prefixed ones)
  const frontendVars = {
    NODE_ENV: rootEnv.NODE_ENV || 'development',
    FRONTEND_PORT: rootEnv.FRONTEND_PORT || '5173',
    FRONTEND_HOST: rootEnv.FRONTEND_HOST || 'localhost',
    FRONTEND_URL: rootEnv.FRONTEND_URL || 'http://localhost:5173',
    VITE_API_BASE_URL: rootEnv.VITE_API_BASE_URL || rootEnv.API_BASE_URL || 'http://localhost:3001/api',
    VITE_WEBSOCKET_URL: rootEnv.VITE_WEBSOCKET_URL || rootEnv.WEBSOCKET_URL || 'http://localhost:3001',
    VITE_BACKEND_URL: rootEnv.VITE_BACKEND_URL || rootEnv.BACKEND_URL || 'http://localhost:3001',
    VITE_FRONTEND_URL: rootEnv.VITE_FRONTEND_URL || rootEnv.FRONTEND_URL || 'http://localhost:5173'
  };

  const header = '# Frontend Environment Configuration for kuikui\n# Generated from root .env file by env-setup.js\n# Note: Only variables prefixed with VITE_ are accessible in the frontend browser code';
  writeEnvFile(frontendEnvPath, frontendVars, header);
  console.log('[create] frontend: .env file updated with root values');
}

function ensureRootEnv() {
  const rootEnvPath = path.join(repoRoot, '.env');
  const rootEnvExamplePath = path.join(repoRoot, '.env.example');

  if (!fs.existsSync(rootEnvPath)) {
    if (!fs.existsSync(rootEnvExamplePath)) {
      console.error('ERROR: Neither .env nor .env.example found in root. Please create .env.example first.');
      process.exit(1);
    }
    
    // Copy .env.example to .env
    fs.copyFileSync(rootEnvExamplePath, rootEnvPath);
    console.log('[create] root: created .env from .env.example');
    console.log('Please review and update the values in .env as needed.\n');
  }
}

function main() {
  console.log('--- Environment Setup Start ---\n');
  console.log(`Repo root resolved to: ${repoRoot}\n`);

  // Ensure root .env exists
  ensureRootEnv();

  // Load root .env file
  const rootEnvPath = path.join(repoRoot, '.env');
  const rootEnv = loadEnvFile(rootEnvPath);
  console.log(`Loaded ${Object.keys(rootEnv).length} variables from root .env`);

  // Create backend and frontend .env files from root values
  createBackendEnv(rootEnv);
  createFrontendEnv(rootEnv);

  console.log('\nEnvironment setup complete.');
  console.log('Root .env values have been distributed to backend and frontend.');
  console.log('--------------------------------\n');
}

main();
