import { execFileSync } from 'node:child_process';

const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] }).trim();
const git = (...args) => run('git', args);
if (git('branch', '--show-current') !== 'dev' || git('status', '--porcelain')) {
  throw new Error('Promotion requires a clean working tree on dev. Commit and push your changes first.');
}
git('fetch', 'origin');
const sha = git('rev-parse', 'dev');
if (sha !== git('rev-parse', 'origin/dev')) throw new Error('Push dev before promotion.');
const runs = JSON.parse(run('gh', ['run', 'list', '--workflow', 'ci.yml', '--branch', 'dev', '--commit', sha, '--event', 'push', '--json', 'conclusion,status,headSha', '--limit', '10']));
if (!runs.some(item => item.headSha === sha && item.status === 'completed' && item.conclusion === 'success')) {
  throw new Error(`Checks and development release have not passed for dev commit ${sha}. Wait for GitHub Actions Checks, then retry.`);
}
git('merge', '--no-edit', 'origin/main');
if (git('rev-parse', 'dev') !== sha) throw new Error('dev changed while syncing main. Push dev and wait for its new checks before retrying.');
git('checkout', 'main');
git('merge', '--ff-only', 'origin/main');
git('merge', '--no-ff', '--no-edit', 'dev');
git('push', 'origin', 'main');
git('checkout', 'dev');
git('merge', '--no-edit', 'main');
git('push', 'origin', 'dev');
console.log('Promoted dev to main with a normal merge and synchronized dev. Main runs its own checks and production release.');
