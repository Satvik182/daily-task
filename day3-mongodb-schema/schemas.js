
use("learning_platform");

// 1. Create collections
db.createCollection("course_progress", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "courseId", "completedLessons",
        "totalLessons", "progressPercent", "status", "updatedAt"],
      properties: {
        userId: { bsonType: "objectId" },
        courseId: { bsonType: "objectId" },
        completedLessons: { bsonType: "int", minimum: 0 },
        totalLessons: { bsonType: "int", minimum: 1 },
        progressPercent: {
          bsonType: ["int", "double"],
          minimum: 0, maximum: 100
        },
        status: {
          enum: ["not_started", "in_progress", "completed"]
        },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("quiz_attempts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["progressId", "userId", "courseId", "quizId",
        "answers", "score", "feedback", "submittedAt"],
      properties: {
        progressId: { bsonType: "objectId" },
        userId: { bsonType: "objectId" },
        courseId: { bsonType: "objectId" },
        quizId: { bsonType: "objectId" },
        answers: { bsonType: "array" },
        score: {
          bsonType: ["int", "double"],
          minimum: 0, maximum: 100
        },
        feedback: {
          bsonType: "object",
          required: ["rating", "comment"],
          properties: {
            rating: {
              bsonType: "int", minimum: 1, maximum: 5
            },
            comment: {
              bsonType: "string", maxLength: 500
            }
          }
        },
        submittedAt: { bsonType: "date" }
      }
    }
  }
});

// 2. Create indexes
db.course_progress.createIndex(
  { userId: 1, courseId: 1 },
  { unique: true }
);

db.quiz_attempts.createIndex(
  { progressId: 1, submittedAt: -1 }
);

// 3. Insert sample progress
const userId = new ObjectId();
const courseId = new ObjectId();

db.course_progress.insertOne({
  userId,
  courseId,
  completedLessons: NumberInt(12),
  totalLessons: NumberInt(16),
  progressPercent: 75,
  status: "in_progress",
  updatedAt: new Date()
});

const progressId = db.course_progress.findOne({
  userId, courseId
})._id;

// 4. Insert quiz attempt
db.quiz_attempts.insertOne({
  progressId,
  userId,
  courseId,
  quizId: new ObjectId(),
  answers: [
    {
      questionId: new ObjectId(),
      selectedOption: "A"
    }
  ],
  score: 85,
  feedback: {
    rating: NumberInt(5),
    comment: "Very useful quiz"
  },
  submittedAt: new Date()
});

// 5. Edge case: duplicate progress
try {
  db.course_progress.insertOne({
    userId,
    courseId,
    completedLessons: NumberInt(5),
    totalLessons: NumberInt(16),
    progressPercent: 31.25,
    status: "in_progress",
    updatedAt: new Date()
  });
} catch (error) {
  print("Duplicate rejected:", error.code === 11000);
}

// 6. Verify
print("Course Progress:");
db.course_progress.find().forEach(printjson);

print("Quiz Attempts:");
db.quiz_attempts.find().forEach(printjson);

print("Course Indexes:");
db.course_progress.getIndexes().forEach(printjson);

print("Quiz Indexes:");
db.quiz_attempts.getIndexes().forEach(printjson);
