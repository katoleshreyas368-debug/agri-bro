const axios = require('axios');

async function go() {
  const base = 'http://127.0.0.1:5001';
  const endpoints = ['/', '/crops', '/auth/users'];
  for (const e of endpoints) {
    try {
      const url = base + e;
      const r = await axios.get(url, { timeout: 3000 });
      console.log('GET', url, '=>', r.status);
      console.log(String(r.data).slice(0, 300));
    } catch (err) {
      console.error('ERR', e, err.message);
    }
  }
}

if (require.main === module) go();
module.exports = go;
