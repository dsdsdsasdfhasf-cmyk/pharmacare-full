import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname);
const dbFile = resolve(projectRoot, 'pharmacy.db');

// Set default environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || dbFile;
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'pharmacare-local-development-secret-key-12345';

console.log('====================================================');
console.log('  PharmaCare - Pharmacy Management System (POS)');
console.log('====================================================\n');

// 1. Verify pnpm is installed
try {
  execSync('pnpm --version', { stdio: 'ignore' });
} catch {
  console.error('ERROR: pnpm is not installed or not in PATH.');
  console.error('Please install pnpm globally: npm install -g pnpm');
  process.exit(1);
}

// 2. Install workspace dependencies
console.log('[1/4] Installing workspace dependencies...');
try {
  execSync('pnpm install --ignore-scripts', { stdio: 'inherit', cwd: projectRoot });
} catch (err) {
  console.error('\nERROR: Dependency installation failed.');
  process.exit(1);
}

// 3. Build core libraries
console.log('\n[2/4] Building core libraries...');
try {
  execSync('pnpm run typecheck:libs', { stdio: 'inherit', cwd: projectRoot });
} catch (err) {
  console.error('\nERROR: Failed to build library packages.');
  process.exit(1);
}

// 4. Seeding database if not exists
if (!existsSync(process.env.DATABASE_URL)) {
  console.log('\n🔧 Database not found. Initializing and seeding sample data...');
  try {
    execSync('pnpm --filter @workspace/db exec node init_db_and_seed.js', { stdio: 'inherit', cwd: projectRoot });
    execSync('pnpm --filter @workspace/db exec node seed_sample_data.js', { stdio: 'inherit', cwd: projectRoot });
    console.log('✅ Database initialized and seeded successfully.');
  } catch (err) {
    console.warn('WARNING: Seeding database failed.');
  }
}

// 5. Start servers
console.log('\n[3/4] Starting API and Frontend servers...');
const apiPort = '8080';
const frontendPort = '5000';

const apiProcess = spawn('pnpm', ['--filter', '@workspace/api-server', 'run', 'dev'], {
  cwd: projectRoot,
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, PORT: apiPort, NODE_ENV: 'development' }
});

const frontendProcess = spawn('pnpm', ['--filter', '@workspace/pharmacy', 'run', 'dev'], {
  cwd: projectRoot,
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, PORT: frontendPort, BASE_PATH: '/' }
});

console.log('\n====================================================');
console.log('  PharmaCare POS is running!');
console.log(`  Frontend:  http://localhost:${frontendPort}`);
console.log(`  API:       http://localhost:${apiPort}`);
console.log('  Press Ctrl+C to stop both servers.');
console.log('====================================================\n');

// 6. Automatically open the browser
setTimeout(() => {
  console.log('Opening browser...');
  const openCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(openCmd, [`http://localhost:${frontendPort}`], { shell: true });
}, 4000);

// Handle graceful shutdown
const cleanup = () => {
  console.log('\nStopping PharmaCare servers...');
  apiProcess.kill();
  frontendProcess.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
