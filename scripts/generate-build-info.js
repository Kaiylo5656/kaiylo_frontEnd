// Script to generate build info at build time
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildInfo = {
  commit: process.env.VERCEL_GIT_COMMIT_SHA || 
           process.env.GIT_COMMIT_SHA || 
           'dev',
  buildTime: new Date().toISOString(),
  env: process.env.VERCEL_ENV || 
       process.env.NODE_ENV || 
       'development',
  url: process.env.VERCEL_URL || 
       process.env.VERCEL_PROJECT_PRODUCTION_URL || 
       ''
};

const outputPath = join(__dirname, '..', 'public', 'build-info.json');

// Ensure directory exists
mkdirSync(dirname(outputPath), { recursive: true });

writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2), 'utf-8');
console.log('✅ Build info generated:', buildInfo);
