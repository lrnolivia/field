import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
function locate(lane) {
  const root = path.join(dir, 'mobile-' + lane);
  return fs.existsSync(path.join(root, 'reports')) ? path.join(root, 'reports') : root;
}
const baseline = locate('baseline'), candidate = locate('candidate');
const json = (root, name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const text = (root, name) => fs.readFileSync(path.join(root, name), 'utf8').trim();
function fileKey(name) { return name.includes('/src/') ? 'src/' + name.split('/src/').slice(1).join('/src/') : name; }
function failures(report) {
  if (!Array.isArray(report.testResults)) throw new Error('Missing full test results');
  const keys = [];
  for (const suite of report.testResults) {
    const failed = (suite.assertionResults || []).filter(t => t.status === 'failed');
    for (const t of failed) keys.push(fileKey(suite.name) + ' :: ' + t.fullName);
    if (suite.status === 'failed' && !failed.length) keys.push(fileKey(suite.name) + ' :: collection/runtime error');
  }
  if (report.numFailedTests > 0 && !keys.length) throw new Error('Unclassified test failures');
  return keys;
}
function lintKeys(report) {
  if (!Array.isArray(report)) throw new Error('Missing lint results');
  return report.flatMap(f => (f.messages || []).map(m =>
    fileKey(f.filePath) + ' :: ' + m.severity + ' :: ' + m.ruleId + ' :: ' + m.message));
}
function added(before, after) {
  const counts = new Map();
  for (const k of before) counts.set(k, (counts.get(k) || 0) + 1);
  return after.filter(k => { const n = counts.get(k) || 0; if (n) { counts.set(k, n - 1); return false; } return true; });
}
const b = json(baseline, 'tests.json'), c = json(candidate, 'tests.json');
const bf = failures(b), cf = failures(c);
const bl = lintKeys(json(baseline, 'lint.json')), cl = lintKeys(json(candidate, 'lint.json'));
const result = {
  baseline_sha: text(baseline, 'head.txt'), candidate_sha: text(candidate, 'head.txt'),
  baseline_failures: bf, candidate_failures: cf,
  added_test_failures: added(bf, cf), resolved_test_failures: added(cf, bf),
  added_lint_findings: added(bl, cl),
  baseline_lint_findings: bl.length, candidate_lint_findings: cl.length,
  tests_baseline: b.numTotalTests, tests_candidate: c.numTotalTests,
  focused_exit: text(candidate, 'focused.exit'),
  browser_exit: text(candidate, 'browser.exit'),
  build_exit: text(candidate, 'build.exit'),
  baseline_build_exit: text(baseline, 'build.exit'),
  full_test_exit: text(candidate, 'tests.exit'),
  lint_exit: text(candidate, 'lint.exit'),
  physical_iphone: 'NOT RUN: Chromium touch emulation is not physical iPhone proof'
};
result.ok = result.baseline_sha === process.env.BASE_SHA && result.candidate_sha === process.env.HEAD_SHA
  && !result.added_test_failures.length && !result.added_lint_findings.length
  && result.tests_candidate >= result.tests_baseline
  && result.focused_exit === '0' && result.browser_exit === '0' && result.build_exit === '0'
  && ['0', '1'].includes(result.full_test_exit) && ['0', '1'].includes(result.lint_exit);
fs.writeFileSync(path.join(dir, 'comparison.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
