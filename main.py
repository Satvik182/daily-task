
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Literal

app = FastAPI(title="Resume Screening Assistant API")

# Temporary in-memory storage
resumes = {}
jobs = {}
screenings = {}


# Request models
class Resume(BaseModel):
    candidate_name: str
    email: EmailStr
    resume_text: str = Field(min_length=1)


class Job(BaseModel):
    job_title: str
    required_skills: list[str] = Field(min_length=1)
    minimum_experience: int = Field(ge=0)
    education: str


class Screening(BaseModel):
    resume_id: str
    job_id: str


class Review(BaseModel):
    reviewer: str
    decision: Literal["shortlisted", "rejected", "on_hold"]
    comments: str = ""


# API 1: Submit Resume
@app.post("/api/v1/resumes", status_code=201)
def submit_resume(data: Resume):
    resume_id = f"RES{len(resumes) + 101}"

    resumes[resume_id] = {
        "resume_id": resume_id,
        **data.model_dump(),
        "status": "uploaded"
    }

    return resumes[resume_id]


# API 2: Create Job Criteria
@app.post("/api/v1/jobs", status_code=201)
def create_job(data: Job):
    job_id = f"JOB{len(jobs) + 101}"

    jobs[job_id] = {
        "job_id": job_id,
        **data.model_dump(),
        "status": "created"
    }

    return jobs[job_id]


# API 3: Generate Screening
@app.post("/api/v1/screenings", status_code=201)
def generate_screening(data: Screening):
    if data.resume_id not in resumes:
        raise HTTPException(404, "Resume not found")

    if data.job_id not in jobs:
        raise HTTPException(404, "Job not found")

    resume = resumes[data.resume_id]
    job = jobs[data.job_id]

    resume_words = resume["resume_text"].lower()
    required = job["required_skills"]

    matched = [
        skill for skill in required
        if skill.lower() in resume_words
    ]

    missing = [
        skill for skill in required
        if skill.lower() not in resume_words
    ]

    score = round((len(matched) / len(required)) * 100)

    screening_id = f"SCR{len(screenings) + 101}"

    result = {
        "screening_id": screening_id,
        "resume_id": data.resume_id,
        "job_id": data.job_id,
        "matched_skills": matched,
        "missing_skills": missing,
        "match_percentage": score,
        "recommendation": "Suitable for human review",
        "final_decision": None
    }

    screenings[screening_id] = result
    return result


# API 4: Human Review
@app.put("/api/v1/reviews/{screening_id}")
def submit_review(screening_id: str, data: Review):
    if screening_id not in screenings:
        raise HTTPException(404, "Screening not found")

    screenings[screening_id]["final_decision"] = data.decision
    screenings[screening_id]["reviewer"] = data.reviewer
    screenings[screening_id]["comments"] = data.comments

    return {
        "screening_id": screening_id,
        "review_status": "completed",
        "reviewer": data.reviewer,
        "final_decision": data.decision,
        "message": "Human review submitted successfully"
    }


@app.get("/")
def home():
    return {"message": "Resume Screening Assistant API is running"}
