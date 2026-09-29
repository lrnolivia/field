import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const versionPath = '.field/handoff-kit/VERSION';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

let canonicalVersion;
try {
  execFileSync('git', ['fetch', 'origin', 'main', '--quiet'], { stdio: 'ignore' });
  canonicalVersion = git(['show', `origin/main:${versionPath}`]);
} catch (error) {
  console.error('Unable to resolve canonical handoff kit from origin/main.');
  process.exit(1);
}

const localVersion = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, 'utf8').trim() : null;
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const status = localVersion === canonicalVersion ? 'current' : 'stale_mirror';

console.log('FIELD_HANDOFF_KIT_STATUS=' + JSON.stringify({
  status,
  branch,
  local_version: localVersion,
  canonical_version: canonicalVersion,
  canonical_source: 'origin/main:.field/handoff-kit'
}));

if (branch === 'main' && status !== 'current') process.exitCode = 1;
