const request = require('supertest');
const app = require('../index');

describe('Auth routes', () => {
  test('POST /auth/login creates or returns a user', async () => {
    const payload = { name: 'Test User', phone: '000-TEST-USER', location: 'Test land', type: 'farmer' };
    const res = await request(app).post('/auth/login').send(payload).expect(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.name).toBe(payload.name);
    expect(res.body.user.phone).toBe(payload.phone);
  });
});
