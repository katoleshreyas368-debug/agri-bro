const request = require('supertest');
const app = require('../index');

describe('Logistics flow', () => {
  test('Create logistics request', async () => {
    const user = await request(app).post('/auth/login').send({ name: 'LogUser', phone: '000-LOG' }).expect(200);
    const farmerId = user.body.user.id;

    const reqPayload = { farmerId, farmerName: 'LogUser', cropType: 'Wheat', quantity: 50, fromLocation: 'Farm', toLocation: 'Market' };
    const create = await request(app).post('/logistics').send(reqPayload).expect(201);
    expect(create.body).toHaveProperty('id');
  });
});
