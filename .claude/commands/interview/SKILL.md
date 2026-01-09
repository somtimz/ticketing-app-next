---
name: interview
description: Conduct structured interviews to collect data. Use phrases like "run an interview", "start interview", "/interview" to trigger. Supports templates: ticket-requirements, user-feedback, or custom questions.
allowed-tools: Read, Write, Bash(cat:*)
---

# Interview Command

## Overview

This command conducts structured interviews to collect information in a conversational format. It guides users through a series of questions and produces structured output saved as JSON files.

## Available Templates

### ticket-requirements
Collect requirements for new ticketing system features. Captures:
- Feature name and priority
- User roles affected
- Functional requirements
- Acceptance criteria
- Technical considerations

### user-feedback
Gather structured user feedback about the ticketing system. Captures:
- User role and experience level
- Usage frequency
- Pain points and suggestions
- Feature requests
- Overall satisfaction

## Usage

### Start a Template Interview

```
/interview ticket-requirements
```
```
Run the user-feedback interview
```

### See Available Templates

```
/interview
```

## Interview Process

1. **Introduction**: Explain the interview purpose and estimated time
2. **Questions**: Ask one question at a time, allowing for follow-up clarification
3. **Confirmation**: Present collected information for review and edits
4. **Output**: Save results to `interview-results/{timestamp}-{type}.json`

## Template Loading

When this command is invoked:

1. If a template name is provided (e.g., `/interview ticket-requirements`), load that template from `templates/`
2. If no template is specified, show available templates and ask user to choose
3. Read the template's introduction and questions
4. Conduct the interview question-by-question
5. Generate output matching the template's output schema

## Output

Interview results are saved to:
```
interview-results/{timestamp}-{type}.json
```

Each output includes:
- `metadata`: Interview type, timestamp, duration, interviewee
- `responses`: Collected data structured according to the template's schema

## Customization

To create new interview templates:
1. Create a new `.md` file in `templates/` directory
2. Follow the format documented in `templates/README.md`
3. Define questions and output schema
4. The template will be automatically available
