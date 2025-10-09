const request = require('supertest');
const app = require('../index');

describe('Crops and bids flow', () => {
  test('Create crop and place a higher bid', async () => {
    // create a farmer user first
    const farmer = await request(app).post('/auth/login').send({ name: 'Crop Tester', phone: '000-CROP', location: 'Farm' }).expect(200);
    const farmerId = farmer.body.user.id;

    const cropPayload = {
      name: 'Test Corn',
      quantity: 10,
      unit: 'quintals',
      basePrice: 1000,
      farmerId,
      farmerName: 'Crop Tester'
    };

    const createRes = await request(app).post('/crops').send(cropPayload).expect(201);
    expect(createRes.body).toHaveProperty('id');
    const cropId = createRes.body.id;

    // place a valid higher bid
    const bidPayload = { buyerId: 'buyer-1', buyerName: 'Buyer One', amount: 1100 };
    const bidRes = await request(app).post(`/crops/${cropId}/bids`).send(bidPayload).expect(201);
    expect(bidRes.body.amount).toBe(1100);

    // fetch crop and verify currentBid updated
    const fetched = await request(app).get(`/crops/${cropId}`).expect(200);
    expect(fetched.body.currentBid).toBeGreaterThanOrEqual(1100);
  });
});
