# Day 3 – MongoDB Schema & Indexes

## Project: Learning Platform

### Objective
Design MongoDB schemas to manage student course progress, quiz attempts, and feedback.

### Collections

**1. course_progress**
- userId: ObjectId
- courseId: ObjectId
- completedLessons: Integer
- totalLessons: Integer
- progressPercent: Number
- status: String
- updatedAt: Date

**2. quiz_attempts**
- progressId: ObjectId
- userId: ObjectId
- courseId: ObjectId
- quizId: ObjectId
- answers: Array
- score: Number
- feedback: Object
- submittedAt: Date

### Relationship
One-to-many relationship using `progressId`. One course progress record can have multiple quiz attempts.

### Validation
MongoDB JSON Schema validates required fields, data types, score ranges, course status, and feedback ratings.

### Indexes
1. `{ userId: 1, courseId: 1 }` – Unique index to find student progress and prevent duplicates.
2. `{ progressId: 1, submittedAt: -1 }` – Speeds up retrieval of recent quiz attempts.

### Trade-offs
Indexes improve read performance but consume storage and increase write overhead.

### Edge Case
Inserting duplicate progress for the same student and course results in an `E11000 duplicate key error`.

### Conclusion
Successfully implemented two related MongoDB collections with validation, indexes, and duplicate-record protection.