#!/usr/bin/env node
/**
 * Build a searchable SQLite FTS5 index from the screeps/docs repo.
 *
 * Usage:
 *   git clone --depth 1 https://github.com/screeps/docs screeps-docs
 *   curl -sL https://raw.githubusercontent.com/screeps/common/master/lib/constants.js -o constants.js
 *   node ingest.mjs --src ./screeps-docs --constants ./constants.js --db ./screeps_docs.db
 *
 * Only dependency: better-sqlite3. Produces one FTS5 table `chunks` where each
 * row is a doc section or an API member (method/property), plus URL metadata.
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const DOCS_BASE = 'https://docs.screeps.com';
const API_BASE = 'https://docs.screeps.com/api/';

const CPU_DESC = {
  0: 'insignificant CPU cost',
  1: 'low CPU cost',
  2: 'medium CPU cost',
  3: 'high CPU cost',
  A: 'action: +0.2 CPU added to natural cost when OK is returned',
};

const FENCE_RE = /(```[\s\S]*?```)/;
const TAG_RE = /\{%[\s\S]*?%\}/g;
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const MEMBER_RE = /^\{%\s*api_(method|property)\s+(.*?)\s*%\}\s*$/m;
const PARAMS_RE = /\{%\s*api_method_params\s*%\}([\s\S]*?)\{%\s*endapi_method_params\s*%\}/g;
const RETCODES_RE = /\{%\s*api_return_codes\s*%\}([\s\S]*?)\{%\s*endapi_return_codes\s*%\}/g;

const MAX_CHUNK = 7000;
const SPLIT_TARGET = 4500;

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '\u2014',
  ndash: '\u2013',
  hellip: '\u2026',
  times: '\u00d7',
  laquo: '\u00ab',
  raquo: '\u00bb',
  rarr: '\u2192',
  larr: '\u2190',
  middot: '\u00b7',
};

function unescapeHtml(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === '#') {
      const code = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Split hexo tag args, honoring single-quoted strings. */
function splitArgs(s) {
  return [...s.matchAll(/'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2]);
}

/** Strip hexo tags and HTML outside fenced code blocks; unescape entities. */
function clean(text) {
  const parts = text.split(FENCE_RE); // even indexes are non-code
  for (let i = 0; i < parts.length; i += 2) {
    let p = parts[i].replace(TAG_RE, ' ').replace(HTML_TAG_RE, ' ');
    p = unescapeHtml(p)
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
    parts[i] = p;
  }
  return parts.join('').trim();
}

const renderParams = (_, body) => `\nParameters:\n${body.trim()}\n`;

function renderRetcodes(_, body) {
  const lines = [];
  for (const line of body.trim().split('\n')) {
    const bar = line.indexOf('|');
    if (bar !== -1) lines.push(`- ${line.slice(0, bar).trim()}: ${line.slice(bar + 1).trim()}`);
    else if (line.trim()) lines.push(line.trim());
  }
  return `\nReturn codes:\n${lines.join('\n')}\n`;
}

/** Best-effort hexo heading anchor: spaces to dashes, keep case. */
const slugAnchor = (h) =>
  h
    .replace(/[^\w\- ]/g, '')
    .trim()
    .replace(/\s+/g, '-');

/** Split oversized chunks on paragraph boundaries. Yields [title, text]. */
function* splitLong(title, text) {
  if (text.length <= MAX_CHUNK) {
    yield [title, text];
    return;
  }
  let buf = [],
    size = 0,
    n = 1;
  for (const p of text.split(/\n\n+/)) {
    if (size + p.length > SPLIT_TARGET && buf.length) {
      yield [`${title} (part ${n})`, buf.join('\n\n')];
      buf = [];
      size = 0;
      n += 1;
    }
    buf.push(p);
    size += p.length + 2;
  }
  if (buf.length) yield [`${title} (part ${n})`, buf.join('\n\n')];
}

// ---------------------------------------------------------------- guide pages

function parseGuideFile(file, rel) {
  const raw = fs.readFileSync(file, 'utf8');
  let title = path.basename(rel, '.md').replace(/-/g, ' ');
  title = title.charAt(0).toUpperCase() + title.slice(1);
  let body = raw;
  const fm = raw.match(/^(?:---\n)?([\s\S]*?)\n---\n/);
  if (fm && fm[1].length < 500) {
    const tm = fm[1].match(/^title:\s*(.+)$/m);
    if (tm) title = tm[1].trim().replace(/^["']|["']$/g, '');
    body = raw.slice(fm[0].length);
  }

  const pageUrl = `${DOCS_BASE}/${rel.replace(/\\/g, '/').replace(/\.md$/, '.html')}`;
  const pieces = body.split(/^(#{2,3}) +(.+)$/m);
  const chunks = [];
  const intro = clean(pieces[0]);
  if (intro) chunks.push([title, title, intro, pageUrl]);

  let h2 = null;
  for (let i = 1; i < pieces.length; i += 3) {
    const level = pieces[i],
      heading = pieces[i + 1].trim(),
      content = clean(pieces[i + 2]);
    let crumb;
    if (level === '##') {
      h2 = heading;
      crumb = `${title} > ${heading}`;
    } else crumb = h2 ? `${title} > ${h2} > ${heading}` : `${title} > ${heading}`;
    if (!content) continue;
    chunks.push([heading, crumb, content, `${pageUrl}#${slugAnchor(heading)}`]);
  }
  return { pageUrl, chunks };
}

// ------------------------------------------------------------------ api pages

function parseApiFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^# +(.+?) *$/m);
  const cls = m ? m[1].trim() : path.basename(file, '.md');
  let body = m ? raw.slice(m.index + m[0].length) : raw;
  body = body.replace(PARAMS_RE, renderParams).replace(RETCODES_RE, renderRetcodes);

  const chunks = [];
  const segments = body.split(new RegExp(MEMBER_RE.source, 'm'));
  const overview = clean(segments[0]);
  if (overview) chunks.push([cls, `API > ${cls}`, overview, `${API_BASE}#${cls}`]);

  for (let i = 1; i < segments.length; i += 3) {
    const kind = segments[i];
    const args = splitArgs(segments[i + 1]);
    const content0 = clean(segments[i + 2]);
    if (!args.length) continue;

    let name = args[0],
      inherited = '';
    const colon = name.indexOf(':'); // "Parent:member" marks inherited members
    if (colon !== -1) {
      inherited = ` (inherited from ${name.slice(0, colon)})`;
      name = name.slice(colon + 1);
    }
    if (name.startsWith(cls + '.')) name = name.slice(cls.length + 1); // some pages fully qualify
    const deprecated = args.slice(1).some((a) => a.includes('"deprecated"')) ? '[DEPRECATED] ' : '';

    let title,
      content = content0;
    if (kind === 'method') {
      const rest = args.slice(1).filter((a) => !a.startsWith('{'));
      let sig = '',
        cpu = null;
      if (rest.length === 1) cpu = rest[0];
      else if (rest.length >= 2) [sig, cpu] = rest;
      const sigs = sig
        ? sig
            .split('|')
            .map((s) => `(${s.trim()})`)
            .join(' / ')
        : '()';
      title = `${deprecated}${cls}.${name}${sigs}${inherited}`;
      if (cpu in CPU_DESC) content = `CPU: ${CPU_DESC[cpu]}\n\n${content}`;
    } else {
      const ptype =
        args.length > 1 && !args[1].startsWith('{') ? args[1].replace(HTML_TAG_RE, '') : '';
      title = `${deprecated}${cls}.${name}${ptype ? ` : ${ptype}` : ''}${inherited}`;
    }
    chunks.push([title, `API > ${cls} > ${name}`, content, `${API_BASE}#${cls}.${name}`]);
  }
  return { cls, chunks };
}

// ------------------------------------------------------------------ constants

function* parseConstants(file, window = 90, overlap = 10) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const total = Math.max(1, Math.ceil(lines.length / (window - overlap)));
  let n = 1;
  for (let i = 0; i < lines.length; i += window - overlap, n += 1) {
    const block = lines.slice(i, i + window).join('\n');
    yield [
      `Game constants (part ${n}/${total})`,
      'API > Constants',
      `\`\`\`javascript\n${block}\n\`\`\``,
      `${API_BASE}#Constants`,
    ];
  }
}

// ----------------------------------------------------------------------- main

const { values: opts } = parseArgs({
  options: {
    src: { type: 'string', default: './screeps-docs' },
    constants: { type: 'string' },
    db: { type: 'string', default: './screeps_docs.db' },
  },
});

const src = opts.src;
if (!fs.existsSync(path.join(src, 'source')) || !fs.existsSync(path.join(src, 'api', 'source'))) {
  console.error(
    `error: ${src} doesn't look like the screeps/docs repo (need source/ and api/source/)`
  );
  process.exit(1);
}

const rows = []; // [title, breadcrumb, content, url, source, page, seq]

// guide pages: source/**/*.md incl. contributed articles; skip hexo internals (_data, _posts)
const guideRoot = path.join(src, 'source');
const guideFiles = fs
  .readdirSync(guideRoot, { recursive: true })
  .filter((f) => f.endsWith('.md') && !f.split(path.sep).some((part) => part.startsWith('_')))
  .sort();
for (const rel of guideFiles) {
  const { pageUrl, chunks } = parseGuideFile(path.join(guideRoot, rel), rel);
  chunks.forEach(([title, crumb, content, url], seq) => {
    for (const [t2, c2] of splitLong(title, content))
      rows.push([t2, crumb, c2, url, 'guide', pageUrl, seq]);
  });
}

// api pages, skipping the inherited/ include fragments (parents cover them)
const apiRoot = path.join(src, 'api', 'source');
for (const f of fs
  .readdirSync(apiRoot)
  .filter((f) => f.endsWith('.md'))
  .sort()) {
  const { cls, chunks } = parseApiFile(path.join(apiRoot, f));
  chunks.forEach(([title, crumb, content, url], seq) => {
    for (const [t2, c2] of splitLong(title, content))
      rows.push([t2, crumb, c2, url, 'api', `${API_BASE}#${cls}`, seq]);
  });
}

if (opts.constants && fs.existsSync(opts.constants)) {
  let seq = 0;
  for (const ch of parseConstants(opts.constants))
    rows.push([...ch, 'api', `${API_BASE}#Constants`, seq++]);
} else {
  console.log(
    'note: no constants.js provided; skipping game constants ' +
      '(grab it from https://raw.githubusercontent.com/screeps/common/master/lib/constants.js)'
  );
}

const db = new Database(opts.db);
db.exec(`
  DROP TABLE IF EXISTS chunks;
  CREATE VIRTUAL TABLE chunks USING fts5(
    title, breadcrumb, content,
    url UNINDEXED, source UNINDEXED, page UNINDEXED, seq UNINDEXED,
    tokenize = 'porter unicode61'
  );
`);
const insert = db.prepare('INSERT INTO chunks VALUES (?,?,?,?,?,?,?)');
db.transaction((all) => all.forEach((r) => insert.run(...r)))(rows);

const apiN = rows.filter((r) => r[4] === 'api').length;
console.log(
  `indexed ${rows.length} chunks (${apiN} api, ${rows.length - apiN} guide) ` +
    `from ${guideFiles.length} guide pages -> ${opts.db}`
);
