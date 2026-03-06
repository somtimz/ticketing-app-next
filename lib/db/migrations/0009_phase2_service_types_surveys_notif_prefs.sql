-- Phase 2: Service Request Types, Satisfaction Surveys, Granular Notification Prefs

-- Add granular notification preferences to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences TEXT;

-- Service Request Types table
CREATE TABLE IF NOT EXISTS service_request_types (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_impact TEXT NOT NULL DEFAULT 'Medium' CHECK (default_impact IN ('Low','Medium','High')),
  default_urgency TEXT NOT NULL DEFAULT 'Medium' CHECK (default_urgency IN ('Low','Medium','High')),
  form_fields TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Ticket satisfaction surveys table
CREATE TABLE IF NOT EXISTS ticket_satisfaction_surveys (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_satisfaction_surveys_token ON ticket_satisfaction_surveys(token);
CREATE INDEX IF NOT EXISTS idx_ticket_satisfaction_surveys_ticket_id ON ticket_satisfaction_surveys(ticket_id);
CREATE INDEX IF NOT EXISTS idx_service_request_types_category_id ON service_request_types(category_id);
