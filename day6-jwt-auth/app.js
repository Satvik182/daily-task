require('dotenv').config();

if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 bytes.');
}

const express = require('express');
const authRoutes = require('./routes/authRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const progressRoutes = require('./routes/progressRoutes');

const app = express();

app.use(express.json({ limit: '16kb' }));
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/progress', progressRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((err, req, res, next) => {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const message = status === 400
    ? 'Invalid JSON request body.'
    : status === 413
      ? 'Request body is too large.'
      : status >= 500
        ? 'Internal server error.'
        : 'Invalid request.';
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Fitness Coaching API listening on port ${port}`));
}

module.exports = app;
