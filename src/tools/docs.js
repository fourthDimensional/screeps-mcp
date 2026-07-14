import Database from 'better-sqlite3';
import { SCREEPS_DOCS_DB } from '../config.js';
import { HarnessError } from '../core/result.js';

const MAX_PAGE_CHARS = 24000;

function getDb() {
  try {
    return new Database(SCREEPS_DOCS_DB, { readonly: true, fileMustExist: true });
  } catch (error) {
    throw new HarnessError(
      'unavailable',
      `Screeps docs index is not available at ${SCREEPS_DOCS_DB}. Run npm run build:docs-index to create it.`,
      { path: SCREEPS_DOCS_DB, message: error.message }
    );
  }
}

function ftsEscape(query, joiner = ' ') {
  const tokens = query.match(/[A-Za-z0-9_.]+/g) ?? [];
  return tokens.length ? tokens.map((t) => `"${t}"`).join(joiner) : '""';
}

function buildSearchSql(scope) {
  const scopeClause = { api: "AND source = 'api'", guide: "AND source = 'guide'" }[scope] ?? '';
  return (
    'SELECT rowid, title, breadcrumb, url, source, ' +
    "snippet(chunks, 2, '>>', '<<', ' ... ', 14) AS snippet " +
    'FROM chunks WHERE chunks MATCH ? ${scopeClause} ' +
    'ORDER BY bm25(chunks, 8.0, 4.0, 1.0, 0, 0, 0, 0) LIMIT ?'
  ).replace('${scopeClause}', scopeClause);
}

export function searchDocs(query, limit = 8, scope = 'all') {
  const db = getDb();
  const sql = buildSearchSql(scope);
  const stmt = db.prepare(sql);
  let rows = stmt.all(ftsEscape(query), limit);
  if (!rows.length) rows = stmt.all(ftsEscape(query, ' OR '), limit);

  return {
    query,
    scope,
    count: rows.length,
    results: rows.map((row) => ({
      id: row.rowid,
      title: row.title,
      breadcrumb: row.breadcrumb,
      source: row.source,
      url: row.url,
      snippet: row.snippet.replace(/\s+/g, ' ').trim(),
    })),
  };
}

export function readSection(id) {
  const db = getDb();
  const row = db
    .prepare('SELECT title, breadcrumb, url, content FROM chunks WHERE rowid = ?')
    .get(id);
  if (!row) {
    throw new HarnessError('not_found', `No documentation section with id ${id}.`, { id });
  }
  return {
    id,
    title: row.title,
    breadcrumb: row.breadcrumb,
    url: row.url,
    content: row.content,
  };
}

export function readPage(id) {
  const db = getDb();
  const hit = db.prepare('SELECT page FROM chunks WHERE rowid = ?').get(id);
  if (!hit) {
    throw new HarnessError('not_found', `No documentation section with id ${id}.`, { id });
  }
  const rows = db
    .prepare('SELECT title, url, content FROM chunks WHERE page = ? ORDER BY seq, rowid')
    .all(hit.page);

  const parts = [];
  let total = 0;
  for (const row of rows) {
    const block = `## ${row.title}\n(${row.url})\n\n${row.content}`;
    if (total + block.length > MAX_PAGE_CHARS) {
      parts.push(
        `[... truncated, ${rows.length - parts.length} sections omitted; use screeps_read_section for specific ones ...]`
      );
      break;
    }
    parts.push(block);
    total += block.length;
  }

  return {
    id,
    page: hit.page,
    sectionCount: rows.length,
    truncated: parts.length < rows.length,
    content: `Page: ${hit.page} (${rows.length} sections)\n\n${parts.join('\n\n---\n\n')}`,
  };
}
