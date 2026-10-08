import { spawnSync } from 'node:child_process';

const optional = process.argv.includes('--if-authenticated');
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
function eas(args, capture = false) {
  return spawnSync(command, ['--yes', 'eas-cli@latest', ...args], {
    cwd: new URL('../apps/mobile/', import.meta.url),
    stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8',
    shell: process.platform === 'win32', env: { ...process.env, CI: '1' },
  });
}
if (optional && eas(['whoami'], true).status !== 0) {
  console.log('Expo login needed: run npx eas-cli@latest login, then npm run setup.');
  process.exit(0);
}
const result = eas(['env:pull', '--environment', 'development', '--path', '.env.local', '--non-interactive']);
if (result.status !== 0) {
  console.error('Cloud setup failed. Run npx eas-cli@latest login, then npm run setup.');
  process.exit(1);
}
console.log('Development Firebase configuration ready. Run npm run start:cloud.');
