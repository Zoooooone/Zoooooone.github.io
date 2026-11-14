import { execFileSync } from 'node:child_process';
import { log } from 'node:console';
import { appendFileSync } from 'node:fs';
import process from 'node:process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trimEnd();
const base = process.argv[2];
const modelWatch =
  /^(?:worker\/src\/models\/|src\/scripts\/model-watch\/|scripts\/mock-stats\/models\.mjs$|src\/pages\/model-watch\.astro$|src\/styles\/pages\/model-watch\.css$|tests\/unit\/(?:model-watch(?:-[\w-]+)?|models-worker)\.test\.ts$|tests\/e2e\/model-watch\.spec\.ts$)/;

let scope = 'full';
if (/^[a-f0-9]{40}$/.test(base ?? '')) {
  try {
    const before = git('rev-parse', '--verify', `${base}^{commit}`);
    git('merge-base', '--is-ancestor', before, 'HEAD');
    const files = git('diff', '--name-only', '--no-renames', '-z', before, 'HEAD').split('\0').filter(Boolean);
    if (files.length && files.every((file) => /^src\/content\/posts\/.+\.md$/.test(file))) scope = 'articles';
    else if (files.length && files.every((file) => modelWatch.test(file))) scope = 'model-watch';
  } catch {
    scope = 'full';
    log('The comparison base is unavailable. Running full verification.');
  }
}

const result = `scope=${scope}\n`;
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, result);
process.stdout.write(result);
