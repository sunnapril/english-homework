// Test copy of the backend: runs the REAL Код.gs + ResultsV2.gs as an Apps Script web app,
// with in-memory Sheets. Emulates how Apps Script builds `e` and how Sheets coerces typed values.
// Admin: GET /admin/reset?gs=orig|patched&coerce=0|1 , GET /admin/state
const http = require('http'), fs = require('fs'), vm = require('vm'), crypto = require('crypto'), url = require('url');
const GS_ROOT = process.env.GS_ROOT || (__dirname + '/gs');  // gs/patched/Код.gs + ResultsV2.gs (not in git)
let env;

function coerce(v, fmt, on) {
  if (!on || fmt === '@' || typeof v !== 'string') return v;
  if (/^\d{1,2}\/\d{1,2}$/.test(v)) { const [a, b] = v.split('/').map(Number); if (a <= 12 && b <= 31) return new Date(2026, a - 1, b); }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function makeSheet(name, opts) {
  const rows = [], formats = [];
  const s = {
    name, rows,
    getLastRow: () => rows.length,
    getRange(r, c, nr = 1, nc = 1) {
      const cells = (fn) => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) fn(r - 1 + i, c - 1 + j, i, j); };
      return {
        setValues(v) { cells((R, C, i, j) => { rows[R] = rows[R] || []; rows[R][C] = coerce(v[i][j], (formats[R] || [])[C], opts.coerce); }); return this; },
        setNumberFormats(f) { cells((R, C, i, j) => { formats[R] = formats[R] || []; formats[R][C] = f[i][j]; }); return this; },
        setNumberFormat() { return this; }, setFontWeight() { return this; }, setWrap() { return this; }, setVerticalAlignment() { return this; },
        getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) { const v = (rows[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined ? '' : v); } out.push(row); } return out; },
        getDisplayValues() { return this.getValues().map(rw => rw.map(v => v instanceof Date ? v.toISOString() : String(v))); },
      };
    },
    appendRow(r) { rows.push(r.map(v => coerce(v, undefined, opts.coerce))); },
  };
  return s;
}

function reset(gsVariant, coerceOn) {
  const opts = { coerce: coerceOn };
  const main = { 'Лист1': makeSheet('Лист1', opts) };
  const v2 = { TEST_RESULTS_V2: makeSheet('TEST_RESULTS_V2', opts) };
  const mails = [];
  const book = sheets => ({ getSheetByName: n => sheets[n] || null, getUrl: () => 'https://docs.google.com/fake' });
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => book(main), openById: () => book(v2), flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: m => mails.push(m.subject) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'V2-ID' }) },
    ContentService: { MimeType: { TEXT: 'text/plain', JSON: 'application/json', JAVASCRIPT: 'application/javascript' },
      createTextOutput: s => ({ content: s, mime: 'text/plain', setMimeType(m) { this.mime = m; return this; }, getContent() { return s; } }) },
    Utilities: { DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 },
      computeDigest: (_, s) => [...crypto.createHash('sha256').update(s, 'utf8').digest()].map(b => (b > 127 ? b - 256 : b)) },
    Logger: { log() {} }, console, Date, JSON, Object, String, Number, Math, isNaN,
  };
  vm.createContext(ctx);
  for (const f of ['Код.gs', 'ResultsV2.gs']) vm.runInContext(fs.readFileSync(`${GS_ROOT}/${gsVariant}/${f}`, 'utf8'), ctx, { filename: f });
  env = { ctx, main, v2, mails, gsVariant, coerceOn };
}

function eventFrom(req, body) {
  const q = url.parse(req.url, true).query; const parameter = { ...q };
  const ctype = req.headers['content-type'] || '';
  const e = { parameter, queryString: url.parse(req.url).query || '' };
  if (req.method === 'POST') {
    e.postData = { contents: body, type: ctype.split(';')[0], length: body.length };
    if (ctype.startsWith('application/x-www-form-urlencoded')) Object.assign(parameter, Object.fromEntries(new URLSearchParams(body)));
  }
  return e;
}

const dump = sh => sh.rows.map(r => r.map(v => (v instanceof Date ? 'DATE:' + v.toISOString() : v)));

http.createServer((req, res) => {
  let body = ''; req.on('data', c => (body += c)); req.on('end', () => {
    const p = url.parse(req.url, true);
    if (p.pathname === '/admin/reset') { reset(p.query.gs || 'patched', p.query.coerce === '1'); res.end('reset ' + env.gsVariant); return; }
    if (p.pathname === '/admin/state') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ gs: env.gsVariant, legacy: dump(env.main['Лист1']), v2: dump(env.v2.TEST_RESULTS_V2), mails: env.mails })); return;
    }
    let out;
    try { out = req.method === 'POST' ? env.ctx.doPost(eventFrom(req, body)) : env.ctx.doGet(eventFrom(req, body)); }
    catch (err) { res.statusCode = 200; res.setHeader('content-type', 'text/html'); res.end('<html>Error: ' + err.message + '</html>'); return; }
    res.setHeader('content-type', out.mime); res.end(out.content);
  });
}).listen(8766, () => { reset('patched', false); console.log('fake Apps Script on 8766'); });
