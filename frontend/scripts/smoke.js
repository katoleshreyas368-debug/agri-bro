// Frontend smoke test: read VITE_API_URL from .env and call a couple of backend endpoints.
const fs = require('fs');
const path = require('path');
const fetch = globalThis.fetch || require('node-fetch');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const env = {};
  for (const l of lines) {
    const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      let val = m[2];
      // strip optional surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[m[1]] = val;
    }
  }
  return env;
}

async function run() {
  const env = loadEnv();
  const base = env.VITE_API_URL || 'http://localhost:5001';
  console.log('Using VITE_API_URL =', base);

  const endpoints = ['/crops', '/auth/users'];
  for (const e of endpoints) {
    try {
      const url = base.replace(/\/$/, '') + e;
      console.log('GET', url);
      const res = await fetch(url, { method: 'GET' });
      console.log('-> status', res.status);
      const text = await res.text();
      console.log('-> body (truncated):', text.slice(0, 200));
    } catch (err) {
      console.error('Request failed for', e, err && err.message ? err.message : err);
    }
  }
}

if (require.main === module) run();
module.exports = run;
