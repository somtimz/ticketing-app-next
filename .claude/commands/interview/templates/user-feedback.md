# User Feedback Interview

## Introduction

Thank you for sharing feedback about the ticketing system. This interview takes 5-7 minutes and will help improve the system.

## Questions

### 1. Background

**Question**: What is your role (agent/customer/admin) and how long have you been using the ticketing system?

**Follow-up prompts**:
- How frequently do you use it? (daily/weekly/monthly)
- What are your primary use cases?

### 2. Overall Experience

**Question**: On a scale of 1-10, how would you rate your overall experience? What factors influenced your rating?

**Follow-up prompts**:
- What's working well?
- What's frustrating?

### 3. Pain Points

**Question**: What are the top 3 problems or frustrations you encounter?

**Follow-up prompts**:
- Walk me through a recent example
- How does this impact your work?

### 4. Workflow & Efficiency

**Question**: Are there tasks that take longer than they should or require too many steps?

**Follow-up prompts**:
- Which workflows could be streamlined?
- What shortcuts or features would help?

### 5. Missing Features

**Question**: What features are missing that would make your work easier?

**Follow-up prompts**:
- How would you envision these features working?
- Are there examples from other systems you like?

### 6. Suggestions

**Question**: If you could change one thing about the ticketing system, what would it be and why?

## Output Schema

```json
{
  "interview_type": "user-feedback",
  "timestamp": "2025-01-01T10:00:00Z",
  "interviewee": "string",
  "role": "agent|customer|admin",
  "experience_duration": "string",
  "usage_frequency": "daily|weekly|monthly",
  "primary_use_cases": ["string"],
  "overall_rating": "1-10",
  "rating_factors": {
    "positive": ["string"],
    "negative": ["string"]
  },
  "pain_points": [
    {
      "problem": "string",
      "example": "string",
      "impact": "string"
    }
  ],
  "workflow_inefficiencies": [
    {
      "task": "string",
      "current_steps": "string",
      "suggested_improvement": "string"
    }
  ],
  "missing_features": [
    {
      "feature": "string",
      "envisioned_usage": "string",
      "external_examples": "string"
    }
  ],
  "top_suggestion": "string",
  "additional_comments": "string"
}
```
