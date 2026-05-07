var crypto = require('crypto');
var zlib = require('zlib');
var util = require('util');
var mysql = require('mysql2/promise');
var awsCaBundle = require('aws-ssl-profiles');

var gzip = util.promisify(zlib.gzip);

var FINGERPRINT_PATH = 'data/latest-fingerprint.json';
var GITHUB_API = 'https://api.github.com';
var GITHUB_TIMEOUT_MS = 30000;

module.exports = function(deps){
  var entryModel = deps.entryModel;
  var userModel = deps.userModel;
  var jawsdbUrl = deps.jawsdbUrl;
  var repo = deps.repo;
  var pat = deps.pat;
  var encryptionKeyB64 = deps.encryptionKey;

  var self = this;

  self.run = async function(){
    if(!jawsdbUrl) throw new Error('JAWSDB_URL is required');
    if(!repo) throw new Error('BACKUP_REPO is required');
    if(!pat) throw new Error('GITHUB_PAT is required');
    if(!encryptionKeyB64) throw new Error('BACKUP_ENCRYPTION_KEY is required');

    var keyTrimmed = encryptionKeyB64.trim();
    var key = Buffer.from(keyTrimmed, 'base64');
    if(key.length !== 32 || key.toString('base64') !== keyTrimmed){
      throw new Error(
        'BACKUP_ENCRYPTION_KEY format invalid: input is ' + keyTrimmed.length +
        ' chars, decodes to ' + key.length + ' bytes; expected 44 chars decoding to 32 bytes' +
        (key.length === 32 ? ' (decoded length is correct, but input contains extra chars — check for quotes, spaces, or stray characters)' : '')
      );
    }

    var current = await computeFingerprint(entryModel, userModel);
    var previous = await fetchLatestFingerprint(repo, pat);
    var nowIso = new Date().toISOString();

    if(previous && fingerprintsEqual(current, previous)){
      console.log('[backup] no DB changes; liveness ping only');
      var liveness = stripMeta(previous);
      liveness.lastCheckedAt = nowIso;
      await pushFingerprint(repo, pat, liveness, previous._sha);
      return { changed: false };
    }

    console.log('[backup] DB changed; creating snapshot');
    var sql = await snapshotDatabase(jawsdbUrl);
    var gzipped = await gzip(Buffer.from(sql, 'utf8'));
    var encrypted = encrypt(gzipped, key);
    var filename = 'data/' + isoUtcStamp() + '.sql.gz.enc';

    await pushFile(repo, pat, filename, encrypted, '[backup] snapshot ' + filename);

    var next = {
      entries: current.entries,
      users: current.users,
      snapshotFile: filename,
      snapshotAt: nowIso,
      lastCheckedAt: nowIso,
    };
    await pushFingerprint(repo, pat, next, previous && previous._sha);

    console.log('[backup] snapshot sql=' + sql.length + 'b gzip=' + gzipped.length + 'b enc=' + encrypted.length + 'b → ' + filename);
    return { changed: true, filename: filename };
  };
};

async function computeFingerprint(entryModel, userModel){
  var results = await Promise.all([
    entryModel.count(),
    entryModel.max('updatedAt'),
    userModel.count(),
    userModel.max('updatedAt'),
  ]);
  return {
    entries: { count: results[0], maxUpdatedAt: results[1] === undefined ? null : results[1] },
    users:   { count: results[2], maxUpdatedAt: normalizeMax(results[3]) },
  };
}

function normalizeMax(value){
  if(value === undefined || value === null) return null;
  if(value instanceof Date) return value.toISOString();
  return value;
}

function fingerprintsEqual(a, b){
  return a.entries.count === b.entries.count
    && a.entries.maxUpdatedAt === b.entries.maxUpdatedAt
    && a.users.count === b.users.count
    && a.users.maxUpdatedAt === b.users.maxUpdatedAt;
}

function stripMeta(fp){
  return {
    entries: fp.entries,
    users: fp.users,
    snapshotFile: fp.snapshotFile,
    snapshotAt: fp.snapshotAt,
  };
}

async function fetchLatestFingerprint(repo, pat){
  var res = await fetch(GITHUB_API + '/repos/' + repo + '/contents/' + FINGERPRINT_PATH, {
    headers: ghHeaders(pat),
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });
  if(res.status === 404) return null;
  if(!res.ok) throw new Error('Fingerprint fetch failed: ' + res.status + ' ' + (await res.text()));
  var data = await res.json();
  var json = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
  json._sha = data.sha;
  return json;
}

async function pushFingerprint(repo, pat, fingerprint, sha){
  await pushFile(
    repo, pat, FINGERPRINT_PATH,
    Buffer.from(JSON.stringify(fingerprint, null, 2), 'utf8'),
    '[backup] update fingerprint',
    sha
  );
}

async function pushFile(repo, pat, path, buffer, message, sha){
  var body = {
    message: message,
    content: buffer.toString('base64'),
  };
  if(sha) body.sha = sha;

  var res = await fetch(GITHUB_API + '/repos/' + repo + '/contents/' + path, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders(pat)),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });
  if(!res.ok) throw new Error('Push failed (' + path + '): ' + res.status + ' ' + (await res.text()));
}

function ghHeaders(pat){
  return {
    Authorization: 'Bearer ' + pat,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'preact-journal-backup',
  };
}

async function snapshotDatabase(connectionString){
  var url = new URL(connectionString);
  var dbName = url.pathname.replace(/^\//, '');
  var conn = await mysql.createConnection({
    host: url.hostname,
    port: url.port ? parseInt(url.port, 10) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: dbName,
    ssl: { ca: awsCaBundle.ca, rejectUnauthorized: true },
    dateStrings: true,
  });

  try {
    var [tables] = await conn.query('SHOW TABLES');
    if(tables.length === 0) return '-- empty database\n';
    var tableKey = Object.keys(tables[0])[0];
    var tableNames = tables.map(function(row){ return row[tableKey]; });

    var parts = [];
    parts.push('SET NAMES utf8mb4;');
    parts.push('SET FOREIGN_KEY_CHECKS = 0;');
    parts.push('');

    for(let i = 0; i < tableNames.length; i++){
      var name = tableNames[i];
      var [createRows] = await conn.query('SHOW CREATE TABLE ??', [name]);
      var createSql = createRows[0]['Create Table'];
      parts.push('-- Schema: ' + name);
      parts.push('DROP TABLE IF EXISTS `' + name + '`;');
      parts.push(createSql + ';');
      parts.push('');
    }

    for(let i = 0; i < tableNames.length; i++){
      var name = tableNames[i];
      var [rows] = await conn.query('SELECT * FROM ??', [name]);
      if(rows.length === 0) continue;
      parts.push('-- Data: ' + name);
      var cols = Object.keys(rows[0]);
      var colList = cols.map(function(c){ return '`' + c + '`'; }).join(', ');
      for(let j = 0; j < rows.length; j++){
        var values = cols.map(function(c){ return mysql.escape(rows[j][c]); }).join(', ');
        parts.push('INSERT INTO `' + name + '` (' + colList + ') VALUES (' + values + ');');
      }
      parts.push('');
    }

    parts.push('SET FOREIGN_KEY_CHECKS = 1;');
    return parts.join('\n');
  } finally {
    await conn.end();
  }
}

function encrypt(plaintext, key){
  var iv = crypto.randomBytes(12);
  var cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  var ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  var authTag = cipher.getAuthTag();
  // [12-byte IV][16-byte authTag][ciphertext]
  return Buffer.concat([iv, authTag, ct]);
}

function isoUtcStamp(){
  var iso = new Date().toISOString();
  return iso.replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
}
