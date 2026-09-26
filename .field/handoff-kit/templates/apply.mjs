import path from 'node:path';
import { fileURLToPath } from 'node:url';

const modulePath = fileURLToPath(import.meta.url);
const packageDir = path.dirname(modulePath);
const checkOnly = process.argv.includes('--check');

function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

export function replaceExactlyOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) fail(`missing required anchor: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    fail(`required anchor is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

if (checkOnly) {
  process.stdout.write(`compatibility check placeholder: ${packageDir}\n`);
  process.exit(0);
}

fail('apply.mjs template must be specialized for the assignment before use');
