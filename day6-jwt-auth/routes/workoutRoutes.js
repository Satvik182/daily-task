const express = require('express');
const { randomUUID } = require('node:crypto');
const authenticateToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { users, workouts } = require('../data/store');

const router = express.Router();

function validExercises(exercises) {
  return Array.isArray(exercises) &&
    exercises.length >= 1 &&
    exercises.length <= 30 &&
    exercises.every((exercise) =>
      exercise &&
      typeof exercise.name === 'string' &&
      exercise.name.trim().length >= 1 &&
      exercise.name.trim().length <= 100 &&
      Number.isInteger(exercise.sets) &&
      exercise.sets >= 1 &&
      exercise.sets <= 100 &&
      Number.isInteger(exercise.reps) &&
      exercise.reps >= 1 &&
      exercise.reps <= 1000
    );
}

function validWorkoutFields({ title, description, exercises }) {
  return typeof title === 'string' &&
    title.trim().length >= 1 &&
    title.trim().length <= 100 &&
    typeof description === 'string' &&
    description.trim().length <= 1000 &&
    validExercises(exercises);
}

router.get('/my', authenticateToken, (req, res) => {
  const assignedWorkouts = workouts.filter((workout) => workout.userId === req.user.id);
  return res.json({ workouts: assignedWorkouts });
});

router.post('/', authenticateToken, requireRole('coach'), (req, res) => {
  const { userId, title, description = '', exercises } = req.body || {};

  if (
    typeof userId !== 'string' ||
    !users.some((user) => user.id === userId) ||
    !validWorkoutFields({ title, description, exercises })
  ) {
    return res.status(400).json({
      error: 'Provide an existing userId, a title, optional description, and valid exercises.',
    });
  }

  const workout = {
    id: randomUUID(),
    userId,
    coachId: req.user.id,
    title: title.trim(),
    description: description.trim(),
    exercises: exercises.map((exercise) => ({
      name: exercise.name.trim(),
      sets: exercise.sets,
      reps: exercise.reps,
    })),
    createdAt: new Date().toISOString(),
  };

  workouts.push(workout);
  return res.status(201).json({ workout });
});

router.patch('/:workoutId', authenticateToken, requireRole('coach'), (req, res) => {
  const workout = workouts.find((item) => item.id === req.params.workoutId);
  if (!workout) return res.status(404).json({ error: 'Workout not found.' });

  const updates = req.body || {};
  const allowedFields = ['userId', 'title', 'description', 'exercises'];
  if (
    Object.keys(updates).length === 0 ||
    Object.keys(updates).some((field) => !allowedFields.includes(field))
  ) {
    return res.status(400).json({ error: 'Provide valid workout fields to update.' });
  }

  const candidate = { ...workout, ...updates };
  if (
    (updates.userId !== undefined &&
      (typeof updates.userId !== 'string' || !users.some((user) => user.id === updates.userId))) ||
    !validWorkoutFields(candidate)
  ) {
    return res.status(400).json({ error: 'Provide valid workout fields to update.' });
  }

  Object.assign(workout, {
    ...(updates.userId !== undefined ? { userId: updates.userId } : {}),
    ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
    ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
    ...(updates.exercises !== undefined
      ? {
          exercises: updates.exercises.map((exercise) => ({
            name: exercise.name.trim(),
            sets: exercise.sets,
            reps: exercise.reps,
          })),
        }
      : {}),
    updatedAt: new Date().toISOString(),
  });

  return res.json({ workout });
});

router.delete('/:workoutId', authenticateToken, requireRole('coach'), (req, res) => {
  const index = workouts.findIndex((workout) => workout.id === req.params.workoutId);
  if (index === -1) return res.status(404).json({ error: 'Workout not found.' });

  workouts.splice(index, 1);
  return res.status(204).end();
});

module.exports = router;