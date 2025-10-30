const axios = require('axios');

// Choose API in order: explicit API env var, then PORT env var, then default to 4000 for local dev
const API = process.env.API ? process.env.API : (process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:4000');

async function run() {
  console.log('API:', API);
  try {
    const farmerRes = await axios.post(`${API}/auth/login`, { name: 'Smoke Farmer Script', phone: '9000000001', location: 'Farm', type: 'farmer' });
    console.log('Farmer:', farmerRes.data);

    const buyerRes = await axios.post(`${API}/auth/login`, { name: 'Smoke Buyer Script', phone: '9000000002', location: 'Market', type: 'buyer' });
    console.log('Buyer:', buyerRes.data);

    const cropsBefore = await axios.get(`${API}/crops`);
    console.log('Crops before:', cropsBefore.data.length || cropsBefore.data);

    const newCrop = {
      name: 'SmokeTest Crop',
      quantity: 7,
      unit: 'quintals',
      basePrice: 1200,
      farmerId: farmerRes.data.user.id,
      farmerName: farmerRes.data.user.name,
      location: 'TestRegion',
      imageUrl: '/images/crops/Corn.jpg',
      endTime: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
    };

    const created = await axios.post(`${API}/crops`, newCrop);
    console.log('Created crop:', created.data);

    const bid = await axios.post(`${API}/crops/${created.data.id}/bids`, { buyerId: buyerRes.data.user.id, buyerName: buyerRes.data.user.name, amount: created.data.basePrice + 100 });
    console.log('Placed bid:', bid.data);

    const cropDetails = await axios.get(`${API}/crops/${created.data.id}`);
    console.log('Crop details after bid:', cropDetails.data);

    const post = await axios.post(`${API}/community`, { authorId: farmerRes.data.user.id, authorName: farmerRes.data.user.name, title: 'SmokeScript', content: 'Hello from smoke script' });
    console.log('Community post:', post.data);

    const reply = await axios.post(`${API}/community/${post.data.id}/replies`, { authorId: buyerRes.data.user.id, authorName: buyerRes.data.user.name, content: 'Thanks' });
    console.log('Reply:', reply.data);

    const log = await axios.post(`${API}/logistics`, { farmerId: farmerRes.data.user.id, farmerName: farmerRes.data.user.name, cropType: created.data.name, quantity: 2, fromLocation: 'Farm', toLocation: 'Market', requestedDate: new Date().toISOString() });
    console.log('Logistics request:', log.data);

    console.log('\nSmoke test completed successfully');
  } catch (err) {
    if (err && err.response) {
      console.error('Smoke test HTTP error status:', err.response.status);
      console.error('Smoke test HTTP error data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Smoke test error message:', err && err.message ? err.message : err);
    }
    console.error('stack:', err && err.stack ? err.stack : 'no stack');
    process.exitCode = 1;
  }
}

run();
