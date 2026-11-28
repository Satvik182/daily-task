# Day 6 - Fitness Coaching Authentication API

A beginner-friendly Express API demonstrating password hashing, one-hour JWT authentication, and role/ownership authorization for a fitness coaching app.

## Features

- Register and log in with email and password.
- Hash passwords with `bcryptjs` using 12 salt rounds; API responses never include the stored hash.
- Sign JWTs with the server-side `JWT_SECRET`; access tokens expire after one hour.
- Assign the `coach` role only to emails on the server-side `COACH_EMAILS` allowlist. All other registrations are `user`, regardless of a submitted `role`.
- Let coaches assign, edit, and delete workout plans.
- Let users view their assigned plans, record completed exercises, and view only their own progress.
- Let authenticated coaches review a user's progress.
- Validate request values and return JSON errors with appropriate HTTP status codes.

## Authentication and authorization flow

1. `POST /api/auth/register` validates the request and stores a bcrypt hash, not the plaintext password.
2. The account role is derived from `COACH_EMAILS`, never from request data.
3. `POST /api/auth/login` verifies the password and returns a signed Bearer token with a one-hour expiry.
4. Protected routes verify the token signature and expiry, then use its signed `sub` and `role` claims. Clients cannot select the authenticated identity or role by sending body fields.
5. Workout ownership is based on the authenticated user's ID. A coach can assign plans to registered users and can manage plans; only the assigned user sees a plan at `/api/workouts/my`.
6. Users can record progress only against their own assigned plans. A user can read only their own progress; a coach can read progress only for users with a plan assigned by that coach.

## Install and run

Requires Node.js 18 or newer.

```powershell
cd D:\CODING\placement-assignments\day6-jwt-auth
npm.cmd install
Copy-Item .env.example .env
```

Generate a strong local secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in `JWT_SECRET` in `.env`. Set `COACH_EMAILS` to one or more comma-separated coach email addresses; users registering with those addresses receive the coach role. Do not commit `.env`. Then run:

```powershell
npm.cmd start
```

The server listens on `http://localhost:3000` by default. `PORT` can be changed in `.env`. `npm.cmd run dev` starts the optional nodemon watcher, and `npm.cmd test` runs the API tests.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `JWT_SECRET` | Yes | Random signing key, at least 32 bytes. Keep it private and out of source control. |
| `PORT` | No | HTTP port; defaults to `3000`. |
| `COACH_EMAILS` | No | Comma-separated emails allowed to register with the coach role. Defaults to no coaches. |

`.env.example` contains placeholders only. Generate a unique local secret; never use the example placeholder in production.

## API

Send JSON requests with `Content-Type: application/json`. For protected routes, send `Authorization: Bearer <token>`.

### Register

`POST /api/auth/register`

```json
{
  "name": "Alex User",
  "email": "alex@example.com",
  "password": "a-strong-password"
}
```

Returns `201` with the public user fields (`id`, `name`, `email`, `role`). Password hashes are not returned. Passwords must be 8-72 bytes. Duplicate email returns `409`; invalid data returns `400`.

### Log in

`POST /api/auth/login`

```json
{
  "email": "alex@example.com",
  "password": "a-strong-password"
}
```

Returns `200` with `token`, `tokenType: "Bearer"`, `expiresIn: 3600`, and public user details. Invalid credentials return `401`.

### View assigned workouts

`GET /api/workouts/my` (authenticated user or coach)

Returns only plans assigned to the identity in the validated JWT.

### Create, update, and delete workouts

- `POST /api/workouts` (coach only)
- `PATCH /api/workouts/:workoutId` (coach only)
- `DELETE /api/workouts/:workoutId` (coach only)

Create request example:

```json
{
  "userId": "the-registered-user-id",
  "title": "Strength Basics",
  "description": "Three-day starter plan",
  "exercises": [
    { "name": "Squat", "sets": 3, "reps": 8 },
    { "name": "Push-up", "sets": 3, "reps": 10 }
  ]
}
```

The `userId` must belong to a registered user. An exercise has a name, `sets` from 1-100, and `reps` from 1-1000; each plan accepts 1-30 exercises. `PATCH` accepts one or more of `userId`, `title`, `description`, and `exercises`. Coach-only access failures return `403`.

### Record progress

`POST /api/progress` (authenticated user)

```json
{
  "workoutId": "the-assigned-workout-id",
  "completedExercises": 2,
  "notes": "Felt good"
}
```

Only the user assigned to the workout may add progress. `completedExercises` must be between zero and the plan's exercise count.

### Read progress

`GET /api/progress/:userId` (owner or coach)

Users may request only their own ID. Coaches may request progress for users to whom they assigned at least one plan; other-user requests return `403`.

## Status codes

- `201`: registration, workout creation, or progress entry succeeded.
- `200`: login, reads, and workout update succeeded.
- `204`: workout deletion succeeded.
- `400`: invalid request data or malformed JSON.
- `401`: missing, invalid, or expired token; invalid credentials.
- `403`: role or ownership permission denied.
- `404`: route or resource not found.
- `409`: duplicate registration email.

## Threat notes and limitations

- **JWT theft:** a stolen Bearer token can be replayed until its one-hour expiry. Use HTTPS, protect client-side token storage, and add revocation/refresh-token handling if the app needs sessions that can be invalidated.
- **Weak secrets:** predictable or exposed signing keys let attackers forge tokens. Use a unique random secret of at least 32 bytes, keep it in environment configuration, and rotate it if compromised.
- **Brute force:** this assignment has no login rate limiting, lockout, or monitoring. Add rate limiting and abuse detection before exposing it publicly.
- **Missing HTTPS:** credentials and tokens can be intercepted in transit without TLS. Deploy behind HTTPS; local HTTP is for development only.
- This project uses in-memory arrays, so users, workouts, and progress reset whenever the process restarts. It is an educational example, not production authentication: add a database, migrations, password reset/MFA, audit logging, and stronger session lifecycle controls for a real service.
