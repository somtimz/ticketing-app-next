# Interview Templates

This directory contains interview templates for the `/interview` slash command.

## Template Format

Each template is a markdown file with the following structure:

```markdown
# Interview Name

## Introduction

A brief welcome message explaining the interview purpose and estimated duration.

## Questions

### Question Number

**Question**: The main question to ask

**Follow-up prompts**:
- Optional follow-up question 1
- Optional follow-up question 2

## Output Schema

```json
{
  "interview_type": "template-name",
  "timestamp": "ISO-8601 timestamp",
  "field_name": "value description",
  "array_field": ["value1", "value2"]
}
```

## Naming Conventions

- Use lowercase letters, numbers, and hyphens only
- Use descriptive names that indicate the interview's purpose
- Examples: `feature-request.md`, `bug-report.md`, `onboarding.md`

## Best Practices

1. **Keep it focused**: Limit interviews to 6-10 questions for completion
2. **Use follow-ups**: Provide optional follow-up prompts to gather deeper insights
3. **Define schemas**: Always include an output schema for structured data
4. **Estimate time**: Include expected duration in the introduction
5. **Group logically**: Number questions and group related topics together

## Example Template

```markdown
# Bug Report Interview

## Introduction

Thank you for reporting a bug. This interview will take 3-5 minutes.

## Questions

### 1. Bug Description

**Question**: What bug did you encounter?

**Follow-up prompts**:
- What were you trying to do when it happened?
- What did you expect to happen?

### 2. Steps to Reproduce

**Question**: What steps can reproduce this bug?

**Follow-up prompts**:
- Can you provide exact clicks or actions?
- Is this reproducible every time?

## Output Schema

```json
{
  "interview_type": "bug-report",
  "timestamp": "string",
  "bug_description": "string",
  "expected_behavior": "string",
  "steps_to_reproduce": ["string"],
  "reproducibility": "always|sometimes|once"
}
```

## Creating a New Template

1. Create a new `.md` file in this directory
2. Follow the format above
3. Add an introduction, questions, and output schema
4. The template will be automatically available when using `/interview`
