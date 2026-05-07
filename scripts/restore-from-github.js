// Fetch an encrypted snapshot from GitHub, decrypt, gunzip, write a .sql file.
// Usage:
//   node scripts/restore-from-github.js latest
//   node scripts/restore-from-github.js data/2026-05-07T03-00-00Z.sql.gz.enc
require('dotenv').load();

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var zlib = require('zlib');
var util = require('util');
var gunzip = util.promisify(zlib.gunzip);

var GITHUB_API = 'https://api.github.com';

async function main(){
  var arg = process.argv[2];
  if(!arg){
    console.error('usage: node scripts/restore-from-github.js <latest | data/...>');
    process.exit(2);
  }

  var repo = required('BACKUP_REPO');
  var pat  = required('GITHUB_PAT');
  var keyTrimmed = required('BACKUP_ENCRYPTION_KEY').trim();
  var key  = Buffer.from(keyTrimmed, 'base64');
  if(key.length !== 32 || key.toString('base64') !== keyTrimmed){
    throw new Error('BACKUP_ENCRYPTION_KEY must be exactly 32 bytes encoded as base64 (44 chars including "=" padding)');
  }

  var target = arg;
  if(arg === 'latest'){
    var fp = await ghJson(repo, pat, 'data/latest-fingerprint.json');
    var meta = JSON.parse(Buffer.from(fp.content, 'base64').toString('utf8'));
    if(!meta.snapshotFile) throw new Error('No snapshotFile in fingerprint yet');
    target = meta.snapshotFile;
    console.log('[restore] latest snapshot = ' + target);
  }

  var fileMeta = await ghJson(repo, pat, target);
  var enc = await fetchContent(fileMeta, pat);

  if(enc.length < 28) throw new Error('Encrypted blob too short: ' + enc.length);
  var iv = enc.subarray(0, 12);
  var authTag = enc.subarray(12, 28);
  var ct = enc.subarray(28);

  var decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  var gzipped = Buffer.concat([decipher.update(ct), decipher.final()]);
  var sql = await gunzip(gzipped);

  var outFile = path.basename(target).replace(/\.sql\.gz\.enc$/, '.sql');
  fs.writeFileSync(outFile, sql);
  console.log('[restore] wrote ' + sql.length + ' bytes to ' + outFile);
}

async function ghJson(repo, pat, contentPath){
  var res = await fetch(GITHUB_API + '/repos/' + repo + '/contents/' + contentPath, {
    headers: ghHeaders(pat),
  });
  if(!res.ok) throw new Error('GitHub fetch failed (' + contentPath + '): ' + res.status + ' ' + (await res.text()));
  return res.json();
}

async function fetchContent(meta, pat){
  // Files <=1MB come inline (base64); larger files use download_url.
  if(meta.content){
    return Buffer.from(meta.content.replace(/\n/g, ''), 'base64');
  }
  if(meta.download_url){
    var res = await fetch(meta.download_url, { headers: ghHeaders(pat) });
    if(!res.ok) throw new Error('Download failed: ' + res.status);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error('No content or download_url');
}

function ghHeaders(pat){
  return {
    Authorization: 'Bearer ' + pat,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'preact-journal-restore',
  };
}

function required(name){
  var v = process.env[name];
  if(!v) throw new Error('Missing env var: ' + name);
  return v;
}

main().catch(function(err){
  console.error(err);
  process.exit(1);
});
