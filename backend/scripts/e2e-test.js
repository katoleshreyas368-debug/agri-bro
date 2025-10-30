const axios = require('axios');

const base = 'http://127.0.0.1:5001';

async function run() {
  try {
    // To run this test, we need an authenticated user. We'll log in to create one.
    const loginRes = await axios.post(base + '/auth/login', { name: 'E2E User', phone: '9000000003' });
    const token = loginRes.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    console.log('Creating crop...');
    const createRes = await axios.post(base + '/crops', {
      name: 'E2E Test Crop',
      quantity: 5,
      unit: 'quintals',
      basePrice: 500,
      imageUrl: '/images/crops/default.jpg'
    }, authHeaders);
    console.log('Created:', createRes.status, createRes.data.id || createRes.data._id || createRes.data);

    const cropId = createRes.data.id || createRes.data._id;
    console.log('Placing bid...');
    const bidRes = await axios.post(`${base}/crops/${cropId}/bids`, { amount: 600 }, authHeaders);
    console.log('Bid placed:', bidRes.status, bidRes.data);

    console.log('Fetching crops to verify...');
    const listRes = await axios.get(base + '/crops');
    const found = (listRes.data || []).find(c => (c.id || c._id) == cropId);
    if (!found) {
      console.error('Created crop not found in GET /crops');
    } else {
      console.log('Found crop currentBid:', found.currentBid);
      console.log('Latest bid in crop:', (found.bids && found.bids[found.bids.length - 1]) || null);
    }
  } catch (err) {
    console.error('E2E error:', err && err.response ? err.response.data || err.response.statusText : err.message);
    process.exit(1);
  }
}

if (require.main === module) run();
module.exports = run;
