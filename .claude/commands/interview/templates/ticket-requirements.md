# Ticket Requirements Interview

## Introduction

Thank you for providing requirements for the ticketing system. This interview will take approximately 5-10 minutes and will help us understand what features you need.

## Questions

### 1. Feature Overview

**Question**: What is the name and brief description of the feature you're requesting?

**Follow-up prompts**:
- Which user roles (agents, customers, admins) will use this feature?
- What problem does this solve?

### 2. Priority & Timeline

**Question**: What is the priority level (Critical/High/Medium/Low) and desired timeline?

**Follow-up prompts**:
- Is there a specific deadline or event driving this timeline?
- What happens if this isn't implemented?

### 3. Functional Requirements

**Question**: What specific functionality should this feature provide?

**Follow-up prompts**:
- Walk me through the user workflow step by step
- What inputs does the user provide? What outputs do they expect?
- Are there edge cases or error conditions to handle?

### 4. User Interface

**Question**: How should users interact with this feature?

**Follow-up prompts**:
- Should this be a new page, modal, or inline component?
- What information needs to be displayed?
- Are there similar features to reference?

### 5. Data & Integration

**Question**: What data needs to be stored or retrieved?

**Follow-up prompts**:
- Which database tables are affected?
- Are there external APIs to integrate with?
- What are the data relationships?

### 6. Acceptance Criteria

**Question**: How will we know this feature is complete and working correctly?

**Follow-up prompts**:
- What are the specific test cases?
- What does "done" look like?

## Output Schema

```json
{
  "interview_type": "ticket-requirements",
  "timestamp": "2025-01-01T10:00:00Z",
  "interviewee": "username or identifier",
  "feature_name": "string",
  "feature_description": "string",
  "priority": "Critical|High|Medium|Low",
  "timeline": "string",
  "deadline_context": "string",
  "user_roles": ["agent", "customer", "admin"],
  "problem_statement": "string",
  "functional_requirements": ["string"],
  "user_workflow": "string",
  "user_inputs": "string",
  "expected_outputs": "string",
  "edge_cases": ["string"],
  "ui_requirements": "string",
  "ui_type": "page|modal|inline",
  "displayed_information": "string",
  "reference_features": "string",
  "data_requirements": "string",
  "database_tables": ["string"],
  "external_apis": ["string"],
  "data_relationships": "string",
  "acceptance_criteria": ["string"],
  "definition_of_done": "string",
  "additional_notes": "string"
}
```
