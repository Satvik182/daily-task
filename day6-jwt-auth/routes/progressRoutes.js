const express = require('express');
const { randomUUID } = require('node:crypto');
const authenticateToken = require('../middleware/authMiddleware');
const { users, workouts, progress } = require('../data/store');

const router = express.Router();

router.get('/:userId', authenticateToken, (req, res) => {
  const isOwner = req.user.id === req.params.userId;
  const isAssignedCoach = req.user.role === 'coach' && workouts.some(
    (workout) => workout.userId === req.params.userId && workout.coachId === req.user.id,
  );
  if (!isOwner && !isAssignedCoach) {
    return res.status(403).json({ error: 'You are not allowed to view this user progress.' });
  }

  if (!users.some((user) => user.id === req.params.userId)) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({
    userId: req.params.userId,
    progress: progress.filter((entry) => entry.userId === req.params.userId),
  });
});

router.post('/', authenticateToken, (req, res) => {
  const { workoutId, completedExercises, notes = '' } = req.body || {};
  const workout = workouts.find(
    (item) => item.id === workoutId && item.userId === req.user.id,
  );

  if (
    !workout ||
    !Number.isInteger(completedExercises) ||
    completedExercises < 0 ||
    completedExercises > workout.exercises.length ||
    typeof notes !== 'string' ||
    notes.length > 500
  ) {
    return res.status(400).json({
      error: 'Provide your assigned workout, completedExercises (0 to exercise count), and optional notes.',
    });
  }

  const entry = {
    id: randomUUID(),
    userId: req.user.id,
    workoutId,
    completedExercises,
    notes: notes.trim(),
    completedAt: new Date().toISOString(),
  };

  progress.push(entry);
  return res.status(201).json({ progress: entry });
});

module.exports = router;
