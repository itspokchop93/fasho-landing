#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REQUIRED_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const OPTIONAL_FILES = ['.env.local', '.env.development', '.env'];

function loadEnvFile(filePath) {
  const dotenv = require('dotenv');
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return undefined;
  }

  const result = dotenv.config({ path: fullPath, override: false, quiet: true });

  if (result.error) {
    throw new Error(`Failed to parse ${filePath}: ${result.error.message}`);
  }

  return result.parsed || {};
}

function ensureEnvLoaded() {
  const loadedKeys = new Set();

  for (const fileName of OPTIONAL_FILES) {
    try {
      const parsed = loadEnvFile(fileName);
      if (parsed) {
        Object.keys(parsed).forEach((key) => loadedKeys.add(key));
      }
    } catch (error) {
      console.error(`\n❌ Environment file error in ${fileName}: ${error.message}`);
      process.exit(1);
    }
  }

  const missingKeys = REQUIRED_KEYS.filter((key) => {
    const value = process.env[key];
    return typeof value === 'undefined' || value.trim() === '';
  });

  if (missingKeys.length > 0) {
    console.error('\n❌ Missing Supabase environment variables.');
    console.error('   Required keys:');
    missingKeys.forEach((key) => console.error(`   - ${key}`));
    console.error('\n   Add them to .env.local (preferred) or .env before running the dev server.');
    console.error('   The dev server exited early so you get a clear error instead of a silent hang.');
    process.exit(1);
  }

  console.log('\n✅ Supabase environment check passed.\n');
}

ensureEnvLoaded();








