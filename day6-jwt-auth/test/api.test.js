const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-secret-that-is-not-used-outside-tests';
process.env.COACH_EMAILS = 'coach@example.test,other-coach@example.test';

const app = require('../app');

test('authentication, roles, ownership, workouts, and progress', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function request(path, { method = 'GET', token, body } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = response.status === 204 ? null : await response.json();
    return { status: response.status, data };
  }

  try {
    const duplicateAttempts = await Promise.all([
      request('/api/auth/register', {
        method: 'POST',
        body: { name: 'Race One', email: 'race@example.test', password: 'strong-pass-000' },
      }),
      request('/api/auth/register', {
        method: 'POST',
        body: { name: 'Race Two', email: 'race@example.test', password: 'strong-pass-111' },
      }),
    ]);
    assert.deepEqual(duplicateAttempts.map((attempt) => attempt.status).sort(), [201, 409]);

    const userRegistration = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Taylor User',
        email: 'user@example.test',
        password: 'strong-pass-123',
        role: 'coach',
      },
    });
    assert.equal(userRegistration.status, 201);
    assert.equal(userRegistration.data.user.role, 'user');
    assert.equal('passwordHash' in userRegistration.data.user, false);

    const coachRegistration = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Casey Coach',
        email: 'coach@example.test',
        password: 'strong-pass-456',
        role: 'user',
      },
    });
    assert.equal(coachRegistration.status, 201);
    assert.equal(coachRegistration.data.user.role, 'coach');

    const otherCoachRegistration = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Another Coach',
        email: 'other-coach@example.test',
        password: 'strong-pass-654',
      },
    });
    assert.equal(otherCoachRegistration.data.user.role, 'coach');

    const outsiderRegistration = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Other User',
        email: 'other@example.test',
        password: 'strong-pass-789',
      },
    });
    assert.equal(outsiderRegistration.status, 201);

    const userId = userRegistration.data.user.id;
    const outsiderId = outsiderRegistration.data.user.id;
    const coachLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'coach@example.test', password: 'strong-pass-456' },
    });
    const otherCoachLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'other-coach@example.test', password: 'strong-pass-654' },
    });
    const userLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'user@example.test', password: 'strong-pass-123' },
    });
    assert.equal(coachLogin.status, 200);
    assert.equal(otherCoachLogin.status, 200);
    assert.equal(userLogin.status, 200);
    assert.equal(jwt.decode(userLogin.data.token).exp - jwt.decode(userLogin.data.token).iat, 3600);

    assert.equal((await request('/api/workouts/my')).status, 401);
    assert.equal((await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'user@example.test', password: 'incorrect-password' },
    })).status, 401);
    assert.equal((await request('/api/workouts', {
      method: 'POST',
      token: userLogin.data.token,
      body: { userId, title: 'Spoofed', exercises: [] },
    })).status, 403);

    const created = await request('/api/workouts', {
      method: 'POST',
      token: coachLogin.data.token,
      body: {
        userId,
        title: 'Strength Basics',
        exercises: [{ name: 'Squat', sets: 3, reps: 8 }],
      },
    });
    assert.equal(created.status, 201);
    const workoutId = created.data.workout.id;

    assert.equal((await request('/api/workouts/my', { token: userLogin.data.token })).data.workouts.length, 1);
    assert.equal((await request('/api/workouts/my', {
      token: (await request('/api/auth/login', {
        method: 'POST',
        body: { email: 'other@example.test', password: 'strong-pass-789' },
      })).data.token,
    })).data.workouts.length, 0);

    const entry = await request('/api/progress', {
      method: 'POST',
      token: userLogin.data.token,
      body: { workoutId, completedExercises: 1, notes: 'Felt good' },
    });
    assert.equal(entry.status, 201);
    assert.equal((await request(`/api/progress/${outsiderId}`, {
      token: userLogin.data.token,
    })).status, 403);
    assert.equal((await request(`/api/progress/${userId}`, {
      token: coachLogin.data.token,
    })).data.progress.length, 1);
    assert.equal((await request(`/api/progress/${userId}`, {
      token: otherCoachLogin.data.token,
    })).status, 403);

    const updated = await request(`/api/workouts/${workoutId}`, {
      method: 'PATCH',
      token: coachLogin.data.token,
      body: { title: 'Strength Basics - Week 1' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.workout.title, 'Strength Basics - Week 1');
    assert.equal((await request(`/api/workouts/${workoutId}`, {
      method: 'DELETE',
      token: userLogin.data.token,
    })).status, 403);

    const expiredToken = jwt.sign(
      { role: 'user' },
      process.env.JWT_SECRET,
      { subject: userId, expiresIn: -1, algorithm: 'HS256' },
    );
    assert.equal((await request('/api/workouts/my', { token: expiredToken })).status, 401);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
