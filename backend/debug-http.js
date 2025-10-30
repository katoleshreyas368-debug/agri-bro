const axios = require('axios');

(async ()=>{
  try {
    console.log('GET /');
    const root = await axios.get('http://localhost:4000/');
    console.log(root.data);
  } catch (e) { console.error('GET / failed', e && e.code, e && e.message, e && e.stack ? e.stack.split('\n')[0] : ''); }

  try {
    console.log('\nGET /health');
    const health = await axios.get('http://localhost:4000/health');
    console.log(health.data);
  } catch (e) { console.error('GET /health failed', e && e.code, e && (e.response ? JSON.stringify(e.response.data) : e.message)); }

  try {
    console.log('\nPOST /auth/login');
    const login = await axios.post('http://localhost:4000/auth/login', { name: 'DebugUser', phone: '9000000010' });
    console.log(login.data);
  } catch (e) { console.error('POST /auth/login failed', e && e.code, e && (e.response ? JSON.stringify(e.response.data) : e.message), e && e.stack ? e.stack.split('\n')[0] : ''); }

  process.exit(0);
})();
