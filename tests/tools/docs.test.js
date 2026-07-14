import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FIXTURE_ROWS = [
  [
    'Creep.moveTo',
    'API > Creep > moveTo',
    'Moves the creep to target with options.',
    'https://docs.screeps.com/api/#Creep.moveTo',
    'api',
    'https://docs.screeps.com/api/#Creep',
    1,
  ],
  [
    'Creep.harvest',
    'API > Creep > harvest',
    'Harvests a source.',
    'https://docs.screeps.com/api/#Creep.harvest',
    'api',
    'https://docs.screeps.com/api/#Creep',
    2,
  ],
  [
    'Towers',
    'Defending your room > Towers',
    'Towers attack and heal.',
    'https://docs.screeps.com/defense.html#Towers',
    'guide',
    'https://docs.screeps.com/defense.html',
    1,
  ],
];

describe('docs tools', () => {
  let tmpDir;
  let dbPath;
  let searchDocs;
  let readSection;
  let readPage;

  before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'screeps-docs-test-'));
    dbPath = path.join(tmpDir, 'test.db');

    const { default: Database } = await import('better-sqlite3');
    const db = new Database(dbPath);
    db.exec(`
      CREATE VIRTUAL TABLE chunks USING fts5(
        title, breadcrumb, content,
        url UNINDEXED, source UNINDEXED, page UNINDEXED, seq UNINDEXED,
        tokenize = 'porter unicode61'
      );
    `);
    const insert = db.prepare('INSERT INTO chunks VALUES (?,?,?,?,?,?,?)');
    db.transaction((rows) => {
      for (const row of rows) insert.run(...row);
    })(FIXTURE_ROWS);
    db.close();

    process.env.SCREEPS_DOCS_DB = dbPath;
    const mod = await import('../../src/tools/docs.js');
    ({ searchDocs, readSection, readPage } = mod);
  });

  after(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('searches across api and guide by default', () => {
    const result = searchDocs('Creep');
    assert.equal(result.count, 2);
    assert.equal(result.results.length, 2);
    assert.ok(result.results.every((r) => r.source === 'api'));
  });

  it('filters results by api scope', () => {
    const result = searchDocs('Creep', 8, 'api');
    assert.equal(result.results.length, 2);
  });

  it('filters results by guide scope', () => {
    const result = searchDocs('Creep', 8, 'guide');
    assert.equal(result.results.length, 0);
  });

  it('finds guide results', () => {
    const result = searchDocs('Towers');
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].source, 'guide');
  });

  it('limits the number of results', () => {
    const result = searchDocs('Creep', 1);
    assert.equal(result.results.length, 1);
  });

  it('reads a section by id', () => {
    const section = readSection(1);
    assert.equal(section.title, 'Creep.moveTo');
    assert.equal(section.url, 'https://docs.screeps.com/api/#Creep.moveTo');
    assert.ok(section.content.includes('Moves the creep'));
  });

  it('reads a whole page by section id', () => {
    const page = readPage(1);
    assert.equal(page.page, 'https://docs.screeps.com/api/#Creep');
    assert.equal(page.sectionCount, 2);
    assert.ok(page.content.includes('Creep.moveTo'));
    assert.ok(page.content.includes('Creep.harvest'));
    assert.equal(page.truncated, false);
  });

  it('returns empty results gracefully', () => {
    const result = searchDocs('xyznonexistent');
    assert.equal(result.results.length, 0);
  });
});
