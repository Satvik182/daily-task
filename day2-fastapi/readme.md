# Day 2 – REST API Design

## Project: Resume Screening Assistant

### 1. Objective
The objective is to design and test REST APIs for a Resume Screening Assistant that evaluates candidate resumes against structured job criteria while maintaining human-review safeguards.

### 2. Technology Stack
- Python
- FastAPI
- Pydantic
- Uvicorn
- Postman

### 3. API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/v1/resumes | Submit candidate resume |
| POST | /api/v1/jobs | Create job criteria |
| POST | /api/v1/screenings | Generate screening result |
| PUT | /api/v1/reviews/{screening_id} | Submit human review |

### 4. Validation
- Candidate name and valid email are required.
- Resume text cannot be empty.
- Job title and required skills are mandatory.
- Minimum experience cannot be negative.
- Invalid resume and job IDs return 404.
- Invalid review decisions are rejected.

### 5. Human Review Safeguards
The screening API generates a recommendation but does not automatically reject or shortlist candidates. The final hiring decision is recorded through the human-review endpoint.

### 6. Error Handling
Example: 404 Not Found when an invalid resume ID is submitted.

### 7. Testing
All four endpoints are tested using Postman. Successful responses and error handling are verified through HTTP status codes and JSON responses.

### 8. Conclusion
Successfully designed and implemented four REST API endpoints for a Resume Screening Assistant, including structured criteria, input validation, error handling, and human-review safeguards.