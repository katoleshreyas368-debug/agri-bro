const request = require('supertest');
const app = require('../index');

describe('Community flow', () => {
  test('Create post and reply', async () => {
    const user = await request(app).post('/auth/login').send({ name: 'ForumUser', phone: '000-FORUM' }).expect(200);
    const authorId = user.body.user.id;

    const postPayload = { authorId, authorName: 'ForumUser', title: 'Hello', content: 'Hello world' };
    const create = await request(app).post('/community').send(postPayload).expect(201);
    expect(create.body).toHaveProperty('id');
    const postId = create.body.id;

    const replyPayload = { authorId, authorName: 'ForumUser', content: 'Thanks!' };
    const reply = await request(app).post(`/community/${postId}/replies`).send(replyPayload).expect(201);
    expect(reply.body).toHaveProperty('id');
  });
});
