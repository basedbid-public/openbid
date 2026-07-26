import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skill = join(root, 'skill');
const runner = join(skill, 'scripts', 'openbid-solana.sh');

test('SKILL.md has discoverable frontmatter and valid local links', () => {
  const markdown = readFileSync(join(skill, 'SKILL.md'), 'utf8');
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, 'missing YAML frontmatter');
  assert.match(match[1], /^name: openbid-solana-launches$/m);
  assert.match(match[1], /^description: .+$/m);

  for (const [, relative] of markdown.matchAll(/\]\((references\/[^)]+)\)/g)) {
    assert.doesNotThrow(() => readFileSync(join(skill, relative), 'utf8'));
  }
});

test('installable skill is MIT licensed', () => {
  assert.match(readFileSync(join(skill, 'LICENSE'), 'utf8'), /^MIT License$/m);
});

test('shell scripts parse successfully', () => {
  execFileSync('bash', ['-n', runner]);
  execFileSync('bash', ['-n', join(root, 'install-skill.sh')]);
});

test('runner blocks unconfirmed execution', () => {
  const result = spawnSync(
    runner,
    ['execute', 'solana-create-lbp', 'src/helpers/configs/solana/create-lbp.json'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(result.status, 3);
  assert.match(result.stderr, /Execution blocked/);
});

test('runner adds a second mainnet gate', () => {
  const directory = mkdtempSync(join(tmpdir(), 'openbid-mainnet-'));
  const config = join(directory, 'config.json');
  const script = `require('node:fs').writeFileSync(process.argv[1], JSON.stringify({chainId:501}))`;
  execFileSync(process.execPath, ['-e', script, config]);

  const result = spawnSync(
    runner,
    ['execute', 'solana-create-lbp', config, '--confirm-execute'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(result.status, 3);
  assert.match(result.stderr, /Mainnet execution blocked/);
});

test('installer creates a self-contained named skill folder', () => {
  const directory = mkdtempSync(join(tmpdir(), 'openbid-install-'));
  execFileSync(join(root, 'install-skill.sh'), ['--target', directory]);
  const installed = join(directory, 'openbid-solana-launches');
  assert.match(readFileSync(join(installed, 'SKILL.md'), 'utf8'), /name: openbid-solana-launches/);
  assert.doesNotThrow(() => readFileSync(join(installed, 'references', 'safety.md'), 'utf8'));
});
