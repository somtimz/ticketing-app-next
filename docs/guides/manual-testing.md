# Manual Testing Guide

This document provides comprehensive test scenarios for manually testing the IT Help Desk application. Use these scenarios to verify that all features work correctly before deploying to production.

## Table of Contents

1. [Test Accounts and Credentials](#test-accounts-and-credentials)
2. [Authentication Tests](#authentication-tests)
3. [Ticket Creation Tests](#ticket-creation-tests)
4. [Ticket Status Update Tests](#ticket-status-update-tests)
5. [SLA Tracking Tests](#sla-tracking-tests)
6. [Permission Tests](#permission-tests)
7. [Knowledge Base Tests](#knowledge-base-tests)
8. [Ticket Assignment Tests](#ticket-assignment-tests)
9. [Test Data Reference](#test-data-reference)

---

## Test Accounts and Credentials

The seed script creates the following test accounts:

| Role | Email | Password | Name | Purpose |
|------|-------|----------|------|---------|
| Admin | admin@company.com | admin123 | System Administrator | Full system access, user management, category management |
| Team Lead | teamlead1@company.com | teamlead123 | David Martinez | View all tickets, assign tickets, view analytics |
| Team Lead | teamlead2@company.com | teamlead123 | Lisa Thompson | View all tickets, assign tickets, view analytics |
| Agent | agent1@company.com | agent123 | Sarah Johnson | View assigned tickets, update ticket status |
| Agent | agent2@company.com | agent123 | Michael Chen | View assigned tickets, update ticket status |
| Agent | agent3@company.com | agent123 | Emily Davis | View assigned tickets, update ticket status |
| Employee | employee1@company.com | employee123 | John Smith | Create tickets, view own tickets |
| Employee | employee2@company.com | employee123 | Jane Doe | Create tickets, view own tickets |
| Employee | employee3@company.com | employee123 | Bob Wilson | Create tickets, view own tickets |
| Employee | employee4@company.com | employee123 | Alice Brown | Create tickets, view own tickets |
| Employee | employee5@company.com | employee123 | Tom Harris | Create tickets, view own tickets |

---

## Authentication Tests

### Test 1.1: Admin Login

**Steps:**
1. Navigate to `/login`
2. Enter email: `admin@company.com`
3. Enter password: `admin123`
4. Click "Login" button

**Expected Results:**
- User is redirected to dashboard
- User's full name "System Administrator" is displayed in the header
- Role "Admin" is visible in user profile
- All navigation links are accessible (including Admin-only links)

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 1.2: Team Lead Login

**Steps:**
1. Navigate to `/login`
2. Enter email: `teamlead1@company.com`
3. Enter password: `teamlead123`
4. Click "Login" button

**Expected Results:**
- User is redirected to dashboard
- User's full name "David Martinez" is displayed in the header
- Role "TeamLead" is visible in user profile
- Can view all tickets (not just own)
- Analytics section is accessible

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 1.3: Agent Login

**Steps:**
1. Navigate to `/login`
2. Enter email: `agent1@company.com`
3. Enter password: `agent123`
4. Click "Login" button

**Expected Results:**
- User is redirected to dashboard
- User's full name "Sarah Johnson" is displayed in the header
- Role "Agent" is visible in user profile
- Can view tickets assigned to them
- Cannot view analytics section

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 1.4: Employee Login

**Steps:**
1. Navigate to `/login`
2. Enter email: `employee1@company.com`
3. Enter password: `employee123`
4. Click "Login" button

**Expected Results:**
- User is redirected to dashboard
- User's full name "John Smith" is displayed in the header
- Role "Employee" is visible in user profile
- Can only view own tickets
- Cannot access admin/management sections

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 1.5: Invalid Credentials

**Steps:**
1. Navigate to `/login`
2. Enter email: `admin@company.com`
3. Enter password: `wrongpassword`
4. Click "Login" button

**Expected Results:**
- Login fails with appropriate error message
- User remains on login page
- No redirect occurs
- Error message indicates invalid credentials

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 1.6: Session Persistence

**Steps:**
1. Login as any user
2. Close browser tab
3. Reopen the application URL
4. Navigate to a protected route

**Expected Results:**
- User remains logged in (session is persisted)
- No need to re-enter credentials
- User can access protected routes

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 1.7: Role-Based UI Differences

**Steps:**
1. Login as `employee1@company.com` (Employee)
2. Note visible navigation items and buttons
3. Logout
4. Login as `admin@company.com` (Admin)
5. Note visible navigation items and buttons

**Expected Results:**
**Employee UI:**
- "Create Ticket" button visible
- Only own tickets visible in list
- No "Manage Users" link
- No "Manage Categories" link
- No "Analytics" section
- No "SLA Policies" link

**Admin UI:**
- "Create Ticket" button visible
- All tickets visible in list
- "Manage Users" link visible
- "Manage Categories" link visible
- "Analytics" section visible
- "SLA Policies" link visible

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

## Ticket Creation Tests

### Test 2.1: Create P1 Ticket (High Impact + High Urgency)

**Steps:**
1. Login as `employee1@company.com`
2. Navigate to "Create Ticket" page
3. Fill in the form:
   - Title: "Server Down - Production Database Unreachable"
   - Description: "Critical production database server is down. Multiple services affected."
   - Category: Network
   - Impact: **High**
   - Urgency: **High**
4. Click "Submit"

**Expected Results:**
- Ticket is created successfully
- **Priority is automatically set to P1**
- Status is set to "Open" (no auto-assignment without category default agent)
- SLA First Response Due: 15 minutes from creation
- SLA Resolution Due: 4 hours (240 minutes) from creation
- Ticket number is generated (e.g., TICK-1019)
- User is redirected to ticket details page
- Created timestamp is set correctly

**Verification:**
```sql
-- Run in database to verify
SELECT ticketNumber, priority, impact, urgency, status,
       slaFirstResponseDue, slaResolutionDue
FROM tickets
WHERE ticketNumber = 'TICK-1019';
```

**Expected Values:**
- priority: P1
- impact: High
- urgency: High
- status: Open
- slaFirstResponseDue: [createdAt] + 15 minutes
- slaResolutionDue: [createdAt] + 240 minutes

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 2.2: Create P2 Ticket (High Impact + Medium Urgency)

**Steps:**
1. Login as `employee2@company.com`
2. Navigate to "Create Ticket" page
3. Fill in the form:
   - Title: "VPN Not Connecting - Remote Team Cannot Access"
   - Description: "VPN connection failing for all remote team members."
   - Category: Network
   - Impact: **High**
   - Urgency: **Medium**
4. Click "Submit"

**Expected Results:**
- Ticket is created successfully
- **Priority is automatically set to P2**
- Status is set to "Open"
- SLA First Response Due: 1 hour (60 minutes) from creation
- SLA Resolution Due: 24 hours (1440 minutes) from creation

**Verification:**
```sql
SELECT ticketNumber, priority, impact, urgency
FROM tickets
WHERE ticketNumber LIKE 'TICK-%'
ORDER BY id DESC LIMIT 1;
```

**Expected Values:**
- priority: P2
- impact: High
- urgency: Medium

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 2.3: Create P3 Ticket (Medium Impact + Medium Urgency)

**Steps:**
1. Login as `employee3@company.com`
2. Create a ticket with:
   - Impact: **Medium**
   - Urgency: **Medium**
   - Category: Software

**Expected Results:**
- **Priority is automatically set to P3**
- SLA First Response Due: 4 hours (240 minutes) from creation
- SLA Resolution Due: 72 hours (4320 minutes) from creation

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 2.4: Create P4 Ticket (Low Impact + Low Urgency)

**Steps:**
1. Login as `employee4@company.com`
2. Create a ticket with:
   - Impact: **Low**
   - Urgency: **Low**
   - Category: Hardware

**Expected Results:**
- **Priority is automatically set to P4**
- SLA First Response Due: 24 hours (1440 minutes) from creation
- SLA Resolution Due: 7 days (10080 minutes) from creation

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 2.5: Verify Priority Calculation Matrix

Create tickets with all 9 combinations of Impact and Urgency:

| Test | Impact | Urgency | Expected Priority |
|------|--------|---------|------------------|
| 2.5a | Low | Low | P4 |
| 2.5b | Low | Medium | P3 |
| 2.5c | Low | High | P2 |
| 2.5d | Medium | Low | P3 |
| 2.5e | Medium | Medium | P2 |
| 2.5f | Medium | High | P1 |
| 2.5g | High | Low | P2 |
| 2.5h | High | Medium | P1 |
| 2.5i | High | High | P1 |

**Steps:**
1. For each combination, create a ticket
2. Record the actual priority assigned
3. Compare with expected priority

**Expected Results:**
All 9 tests should match the expected priority in the matrix above.

**Actual Results:**
- 2.5a (Low+Low): Expected P4, Actual: _____
- 2.5b (Low+Medium): Expected P3, Actual: _____
- 2.5c (Low+High): Expected P2, Actual: _____
- 2.5d (Medium+Low): Expected P3, Actual: _____
- 2.5e (Medium+Medium): Expected P2, Actual: _____
- 2.5f (Medium+High): Expected P1, Actual: _____
- 2.5g (High+Low): Expected P2, Actual: _____
- 2.5h (High+Medium): Expected P1, Actual: _____
- 2.5i (High+High): Expected P1, Actual: _____

**Overall Result:** Pass/Fail _____________

---

### Test 2.6: Verify SLA Due Date Calculations

**Steps:**
1. Create tickets for each priority level
2. Record the createdAt timestamp
3. Calculate expected SLA due dates
4. Compare with actual values in database

**Expected SLA Values:**

| Priority | First Response | Resolution |
|----------|----------------|------------|
| P1 | 15 minutes | 4 hours (240 min) |
| P2 | 1 hour (60 min) | 24 hours (1440 min) |
| P3 | 4 hours (240 min) | 72 hours (4320 min) |
| P4 | 24 hours (1440 min) | 7 days (10080 min) |

**Verification Query:**
```sql
SELECT ticketNumber, priority, createdAt,
       datetime(slaFirstResponseDue) as firstResponseDue,
       datetime(slaResolutionDue) as resolutionDue,
       cast((julianday(slaFirstResponseDue) - julianday(createdAt)) * 1440 as integer) as firstResponseMinutes,
       cast((julianday(slaResolutionDue) - julianday(createdAt)) * 1440 as integer) as resolutionMinutes
FROM tickets
ORDER BY id DESC LIMIT 4;
```

**Actual Results:**
- P1 First Response: _____ minutes (expected: 15)
- P1 Resolution: _____ minutes (expected: 240)
- P2 First Response: _____ minutes (expected: 60)
- P2 Resolution: _____ minutes (expected: 1440)
- P3 First Response: _____ minutes (expected: 240)
- P3 Resolution: _____ minutes (expected: 4320)
- P4 First Response: _____ minutes (expected: 1440)
- P4 Resolution: _____ minutes (expected: 10080)

**Overall Result:** Pass/Fail _____________

---

### Test 2.7: Ticket with Different Categories

**Steps:**
1. Create 4 tickets, one for each category:
   - Hardware: "Monitor not working"
   - Software: "Application crashes"
   - Network: "WiFi not connecting"
   - Access: "Need password reset"
2. Verify each ticket has the correct category assigned

**Expected Results:**
- All tickets created successfully
- Category field correctly set for each
- Ticket numbers are sequential
- All other fields calculated correctly

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

## Ticket Status Update Tests

### Test 3.1: Valid Status Transitions

**Valid Status Transitions:**
- Open → In Progress
- Open → Resolved
- In Progress → Resolved
- Resolved → Closed
- Any status → Closed (with proper permissions)

**Test 3.1a: Open → In Progress**

**Steps:**
1. Login as `agent1@company.com`
2. Navigate to ticket TICK-1001 (Open status)
3. Change status to "In Progress"
4. Submit

**Expected Results:**
- Status updated to "In Progress"
- Timestamp fields updated correctly
- Status history entry created
- Success message displayed

**Verification:**
```sql
SELECT ticketNumber, status, updatedAt, resolvedAt, closedAt
FROM tickets
WHERE ticketNumber = 'TICK-1001';
```

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 3.1b: In Progress → Resolved**

**Steps:**
1. Login as `agent1@company.com`
2. Navigate to a ticket with "In Progress" status
3. Change status to "Resolved"
4. Add resolution notes: "Fixed the issue"
5. Submit

**Expected Results:**
- Status updated to "Resolved"
- **resolvedAt timestamp is set** (not null)
- Resolution field contains the notes
- Status history entry created

**Verification:**
```sql
SELECT status, resolvedAt IS NOT NULL as hasResolvedAt, resolution
FROM tickets
WHERE ticketNumber = 'TICK-1001';
```

**Expected:**
- status: Resolved
- hasResolvedAt: 1 (true)
- resolution: "Fixed the issue"

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 3.1c: Resolved → Closed**

**Steps:**
1. Login as `agent1@company.com` (or Team Lead/Admin)
2. Navigate to a ticket with "Resolved" status
3. Change status to "Closed"
4. Submit

**Expected Results:**
- Status updated to "Closed"
- **closedAt timestamp is set** (not null)
- resolvedAt timestamp remains unchanged
- Status history entry created

**Verification:**
```sql
SELECT status, resolvedAt IS NOT NULL as hasResolvedAt,
       closedAt IS NOT NULL as hasClosedAt
FROM tickets
WHERE status = 'Closed'
ORDER BY id DESC LIMIT 1;
```

**Expected:**
- status: Closed
- hasResolvedAt: 1 (true)
- hasClosedAt: 1 (true)

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 3.2: Invalid Status Transitions

**These transitions should be blocked:**

- Closed → Any other status (should fail)
- Resolved → Open (should fail)
- Resolved → In Progress (should fail)

**Test 3.2a: Attempt Closed → Open**

**Steps:**
1. Login as `admin@company.com`
2. Navigate to ticket TICK-1009 (Closed status)
3. Attempt to change status to "Open"
4. Submit

**Expected Results:**
- Update is **rejected**
- Error message: "Cannot reopen a closed ticket"
- Status remains "Closed"
- No status history entry created

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 3.2b: Attempt Resolved → Open**

**Steps:**
1. Login as `agent1@company.com`
2. Navigate to a ticket with "Resolved" status
3. Attempt to change status to "Open"
4. Submit

**Expected Results:**
- Update is **rejected** (or server validates this)
- Error message displayed
- Status remains "Resolved"

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 3.3: Permission Checks for Status Updates

**Test 3.3a: Employee Cannot Update Others' Tickets**

**Steps:**
1. Login as `employee1@company.com`
2. Attempt to update ticket TICK-1003 (created by employee2)
3. Try to change status to "In Progress"
4. Submit

**Expected Results:**
- Update is **rejected**
- Error message: "You do not have permission to modify this ticket"
- HTTP 403 Forbidden response
- Status remains unchanged

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 3.3b: Employee Can Update Own Tickets**

**Steps:**
1. Login as `employee1@company.com`
2. Navigate to a ticket created by employee1
3. Change status from "Open" to "In Progress"
4. Submit

**Expected Results:**
- Update is **accepted**
- Status changes to "In Progress"
- Success message displayed

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 3.3c: Agent Can Update Assigned Tickets**

**Steps:**
1. Login as `agent1@company.com`
2. Navigate to ticket TICK-1001 (assigned to agent1)
3. Change status
4. Submit

**Expected Results:**
- Update is **accepted**
- Status changes successfully
- Agent is listed in status history as the changer

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 3.3d: Team Lead Can Update Any Ticket**

**Steps:**
1. Login as `teamlead1@company.com`
2. Navigate to any ticket (created by anyone)
3. Change status
4. Submit

**Expected Results:**
- Update is **accepted**
- Status changes successfully
- Team Lead is listed in status history

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 3.3e: Admin Can Update Any Ticket**

**Steps:**
1. Login as `admin@company.com`
2. Navigate to any ticket
3. Change status
4. Submit

**Expected Results:**
- Update is **accepted**
- Status changes successfully
- Admin is listed in status history

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 3.4: Timestamp Handling

**Test 3.4a: Verify resolvedAt is Set**

**Steps:**
1. Create a new ticket (status: Open)
2. Update status to "Resolved"
3. Check database

**Expected Results:**
- resolvedAt is NOT NULL
- resolvedAt is approximately equal to current time
- closedAt remains NULL

**Verification:**
```sql
SELECT status,
       resolvedAt IS NOT NULL as resolvedAtSet,
       closedAt IS NOT NULL as closedAtSet
FROM tickets
WHERE ticketNumber = '[your ticket number]';
```

**Actual Results:**
- resolvedAtSet: _____ (expected: 1/true)
- closedAtSet: _____ (expected: 0/false)
- Pass/Fail: _____________

---

**Test 3.4b: Verify closedAt is Set**

**Steps:**
1. Take a ticket with "Resolved" status
2. Update status to "Closed"
3. Check database

**Expected Results:**
- closedAt is NOT NULL
- resolvedAt remains unchanged (still set)
- Both timestamps are present

**Verification:**
```sql
SELECT status,
       resolvedAt IS NOT NULL as resolvedAtSet,
       closedAt IS NOT NULL as closedAtSet,
       closedAt >= resolvedAt as closedAfterResolved
FROM tickets
WHERE status = 'Closed'
ORDER BY id DESC LIMIT 1;
```

**Expected:**
- resolvedAtSet: 1
- closedAtSet: 1
- closedAfterResolved: 1

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 3.4c: Verify updatedAt is Always Updated**

**Steps:**
1. Note the current updatedAt timestamp for a ticket
2. Wait 10 seconds
3. Update the ticket status
4. Check updatedAt

**Expected Results:**
- updatedAt has changed
- New updatedAt > old updatedAt
- Difference is approximately 10+ seconds

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

## SLA Tracking Tests

### Test 4.1: SLA Policy Application

**Test 4.1a: P1 SLA Policy**

**Steps:**
1. Create a ticket with High Impact + High Urgency (P1)
2. Check the sla_first_response_due and sla_resolution_due fields

**Expected Results:**
- sla_first_response_due = createdAt + 15 minutes
- sla_resolution_due = createdAt + 4 hours (240 minutes)

**Verification:**
```sql
SELECT ticketNumber, priority, createdAt,
       datetime(slaFirstResponseDue) as firstResponseDue,
       datetime(slaResolutionDue) as resolutionDue,
       cast((julianday(slaFirstResponseDue) - julianday(createdAt)) * 1440 as integer) as firstResponseWindow
FROM tickets
WHERE priority = 'P1'
ORDER BY id DESC LIMIT 1;
```

**Expected:**
- firstResponseWindow: 15

**Actual Results:**
- firstResponseWindow: _____ minutes
- Pass/Fail: _____________

---

**Test 4.1b: P2 SLA Policy**

**Steps:**
1. Create a ticket with High Impact + Medium Urgency (P2)
2. Check SLA fields

**Expected Results:**
- sla_first_response_due = createdAt + 60 minutes
- sla_resolution_due = createdAt + 1440 minutes (24 hours)

**Actual Results:**
- firstResponseWindow: _____ minutes (expected: 60)
- resolutionWindow: _____ minutes (expected: 1440)
- Pass/Fail: _____________

---

**Test 4.1c: P3 SLA Policy**

**Steps:**
1. Create a ticket with Medium Impact + Medium Urgency (P3)
2. Check SLA fields

**Expected Results:**
- sla_first_response_due = createdAt + 240 minutes (4 hours)
- sla_resolution_due = createdAt + 4320 minutes (72 hours)

**Actual Results:**
- firstResponseWindow: _____ minutes (expected: 240)
- resolutionWindow: _____ minutes (expected: 4320)
- Pass/Fail: _____________

---

**Test 4.1d: P4 SLA Policy**

**Steps:**
1. Create a ticket with Low Impact + Low Urgency (P4)
2. Check SLA fields

**Expected Results:**
- sla_first_response_due = createdAt + 1440 minutes (24 hours)
- sla_resolution_due = createdAt + 10080 minutes (7 days)

**Actual Results:**
- firstResponseWindow: _____ minutes (expected: 1440)
- resolutionWindow: _____ minutes (expected: 10080)
- Pass/Fail: _____________

---

### Test 4.2: SLA Status Calculation

**SLA Status Logic:**
- **breached**: Current time > due date
- **warning**: Within 20% of time window before due date
- **ok**: More than 20% of time window remaining

**Test 4.2a: SLA Status - OK**

**Steps:**
1. Create a new P3 ticket
2. Immediately check the SLA status in the UI or API

**Expected Results:**
- SLA status shows "ok" (green indicator)
- Time remaining > 80% of total window
- No warnings displayed

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 4.2b: SLA Status - Warning**

**Steps:**
1. Create a P4 ticket (24-hour first response window)
2. Manually update the database to set createdAt to 19.5 hours ago
3. Check the SLA status

**Database Update:**
```sql
UPDATE tickets
SET createdAt = datetime('now', '-19.5 hours')
WHERE ticketNumber = '[your P4 ticket number]';
```

**Expected Results:**
- SLA status shows "warning" (yellow indicator)
- Time remaining < 20% of window (less than 4.8 hours)
- Warning message displayed

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 4.2c: SLA Status - Breached**

**Steps:**
1. Create a P4 ticket
2. Manually update the database to set createdAt to 25 hours ago
3. Check the SLA status

**Database Update:**
```sql
UPDATE tickets
SET createdAt = datetime('now', '-25 hours')
WHERE ticketNumber = '[your P4 ticket number]';
```

**Expected Results:**
- SLA status shows "breached" (red indicator)
- Time remaining is negative
- Breach warning message displayed
- Ticket may be flagged for escalation

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 4.3: SLA Breach Detection

**Test 4.3a: First Response Breach**

**Steps:**
1. Create a P1 ticket (15-minute first response SLA)
2. Wait 16 minutes (or manually set createdAt to 16 minutes ago)
3. Check if first response breach is detected

**Expected Results:**
- SLA first response status: "breached"
- Ticket is flagged or highlighted
- Breach timestamp is recorded
- Notification/alert is shown

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 4.3b: Resolution Breach**

**Steps:**
1. Create a P1 ticket (4-hour resolution SLA)
2. Set ticket status to "In Progress"
3. Manually set createdAt to 5 hours ago
4. Check if resolution breach is detected

**Expected Results:**
- SLA resolution status: "breached"
- Ticket is flagged for escalation
- Different indicator than first response breach

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

## Permission Tests

### Test 5.1: Employee Permissions

**Employee Capabilities:**
- Create tickets
- View own tickets only
- Update own ticket status
- Cannot assign tickets
- Cannot view all tickets
- Cannot manage users
- Cannot manage categories
- Cannot view analytics
- Cannot manage SLA policies

**Test 5.1a: Employee Can View Own Tickets**

**Steps:**
1. Login as `employee1@company.com`
2. Navigate to tickets list
3. Check which tickets are visible

**Expected Results:**
- Only tickets created by employee1 are visible
- Tickets created by others are NOT visible
- Ticket count matches (should see tickets from seed data)

**Verification:**
```sql
SELECT COUNT(*) as ticketCount
FROM tickets t
JOIN callers c ON t.callerId = c.id
WHERE c.email = 'employee1@company.com';
```

**Actual Results:**
- Visible ticket count: _____
- Expected ticket count: _____
- Pass/Fail: _____________

---

**Test 5.1b: Employee Cannot View Others' Tickets**

**Steps:**
1. Login as `employee1@company.com`
2. Try to access ticket TICK-1003 (created by employee2)
   - Direct URL: `/tickets/TICK-1003`
   - Or API call: `GET /api/tickets/TICK-1003`

**Expected Results:**
- Access is **denied**
- Error message: "Ticket not found" or "Access denied"
- HTTP 404 or 403 response
- No ticket details shown

**Actual Results:**
- Pass/Fail: _____________
- HTTP Status: _____
- Notes: _______________________________________________

---

**Test 5.1c: Employee Cannot Assign Tickets**

**Steps:**
1. Login as `employee1@company.com`
2. Navigate to own ticket
3. Try to assign to an agent
4. Submit

**Expected Results:**
- Assignment is **rejected**
- Error message: "You do not have permission to assign tickets"
- HTTP 403 Forbidden
- assignedAgentId remains NULL

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 5.1d: Employee Cannot Access Admin Sections**

**Steps:**
1. Login as `employee1@company.com`
2. Try to access:
   - `/admin/users`
   - `/admin/categories`
   - `/admin/sla-policies`
   - `/analytics`

**Expected Results:**
- All requests return 403 Forbidden
- Error message: "You do not have permission to access this resource"
- Redirect to dashboard or error page

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 5.2: Agent Permissions

**Agent Capabilities:**
- Create tickets
- View assigned tickets (not all tickets)
- Update assigned ticket status
- Add comments to assigned tickets
- Cannot view unassigned tickets (unless created by self)
- Cannot manage users
- Cannot manage categories
- Cannot view analytics
- Cannot manage SLA policies

**Test 5.2a: Agent Can View Assigned Tickets**

**Steps:**
1. Login as `agent1@company.com`
2. Navigate to tickets list
3. Check which tickets are visible

**Expected Results:**
- Tickets assigned to agent1 are visible
- Tickets assigned to other agents are NOT visible
- Unassigned tickets are NOT visible (unless created by agent1)

**Verification:**
```sql
SELECT ticketNumber, title, assignedAgentId
FROM tickets
WHERE assignedAgentId = (SELECT id FROM users WHERE email = 'agent1@company.com')
ORDER BY ticketNumber;
```

**Expected Tickets from Seed Data:**
- TICK-1001 (assigned to agent1)
- TICK-1002 (assigned to agent1)
- TICK-1004 (assigned to agent2 - NOT visible)
- TICK-1009 (assigned to agent1)

**Actual Results:**
- Visible tickets: _______________________________
- Pass/Fail: _____________

---

**Test 5.2b: Agent Cannot View Unassigned Tickets**

**Steps:**
1. Login as `agent1@company.com`
2. Try to access TICK-1003 (unassigned ticket)

**Expected Results:**
- Access is **denied**
- Error message displayed
- HTTP 403 or 404

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 5.2c: Agent Can Update Assigned Ticket Status**

**Steps:**
1. Login as `agent1@company.com`
2. Navigate to TICK-1001 (assigned to agent1)
3. Change status to "Resolved"
4. Submit

**Expected Results:**
- Update is **accepted**
- Status changes to "Resolved"
- resolvedAt timestamp is set
- Agent listed in status history

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 5.2d: Agent Cannot Update Tickets Assigned to Others**

**Steps:**
1. Login as `agent1@company.com`
2. Try to update TICK-1004 (assigned to agent2)
3. Change status
4. Submit

**Expected Results:**
- Update is **rejected**
- Error message: "You cannot modify this ticket"
- HTTP 403 Forbidden
- Status remains unchanged

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 5.3: Team Lead Permissions

**Team Lead Capabilities:**
- Create tickets
- View ALL tickets
- Update any ticket status
- Assign tickets to agents
- View analytics and reports
- Cannot manage users
- Cannot manage categories
- Cannot manage SLA policies

**Test 5.3a: Team Lead Can View All Tickets**

**Steps:**
1. Login as `teamlead1@company.com`
2. Navigate to tickets list
3. Check ticket count

**Expected Results:**
- All tickets in the system are visible
- Ticket count = total tickets in database
- No filtering by assignment or creator

**Verification:**
```sql
SELECT COUNT(*) as totalTickets FROM tickets;
```

**Actual Results:**
- Visible ticket count: _____
- Total ticket count: _____
- Pass/Fail: _____________

---

**Test 5.3b: Team Lead Can Assign Tickets**

**Steps:**
1. Login as `teamlead1@company.com`
2. Navigate to TICK-1003 (unassigned)
3. Assign to `agent1@company.com`
4. Submit

**Expected Results:**
- Assignment is **accepted**
- assignedAgentId is set to agent1's ID
- Ticket appears in agent1's queue
- Status history entry created

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 5.3c: Team Lead Can Reassign Tickets**

**Steps:**
1. Login as `teamlead1@company.com`
2. Navigate to TICK-1001 (assigned to agent1)
3. Reassign to `agent2@company.com`
4. Submit

**Expected Results:**
- Reassignment is **accepted**
- assignedAgentId updated to agent2's ID
- Ticket removed from agent1's queue
- Ticket added to agent2's queue

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 5.3d: Team Lead Can View Analytics**

**Steps:**
1. Login as `teamlead1@company.com`
2. Navigate to `/analytics`

**Expected Results:**
- Analytics page loads successfully
- Can view ticket statistics
- Can view team performance metrics
- Can view SLA compliance reports

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 5.3e: Team Lead Cannot Manage Users**

**Steps:**
1. Login as `teamlead1@company.com`
2. Try to access `/admin/users`

**Expected Results:**
- Access is **denied**
- HTTP 403 Forbidden
- Error message about insufficient permissions

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 5.4: Admin Permissions

**Admin Capabilities:**
- All Team Lead capabilities
- Manage users (create, edit, delete, deactivate)
- Manage categories (create, edit, delete)
- Manage SLA policies
- Full access to all system features

**Test 5.4a: Admin Can Manage Users**

**Steps:**
1. Login as `admin@company.com`
2. Navigate to `/admin/users`
3. Create a new user:
   - Email: testuser@company.com
   - Name: Test User
   - Role: Agent
4. Submit

**Expected Results:**
- User creation is **accepted**
- New user appears in users list
- User can log in with assigned credentials
- Default password is set

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 5.4b: Admin Can Manage Categories**

**Steps:**
1. Login as `admin@company.com`
2. Navigate to `/admin/categories`
3. Create a new category:
   - Name: "Security"
   - Description: "Security-related issues"
4. Submit

**Expected Results:**
- Category creation is **accepted**
- New category appears in category list
- Category is available in ticket creation form

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 5.4c: Admin Can Manage SLA Policies**

**Steps:**
1. Login as `admin@company.com`
2. Navigate to `/admin/sla-policies`
3. Edit P1 SLA policy:
   - Change first response to 10 minutes
   - Change resolution to 180 minutes
4. Submit

**Expected Results:**
- Policy update is **accepted**
- New SLA values are saved
- New tickets use updated SLA values

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

**Test 5.4d: Admin Can Do Everything**

**Steps:**
1. Login as `admin@company.com`
2. Verify access to all sections:
   - Create ticket ✓
   - View all tickets ✓
   - Update any ticket ✓
   - Assign tickets ✓
   - View analytics ✓
   - Manage users ✓
   - Manage categories ✓
   - Manage SLA policies ✓

**Expected Results:**
- All features are accessible
- No 403 errors
- Full control over system

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

## Knowledge Base Tests

### Test 7.1: Browse KB as Employee

**Steps:**
1. Login as `employee1@company.com`
2. Navigate to `/dashboard/kb`

**Expected Results:**
- "Knowledge Base" nav link is visible in the sidebar
- 8 published articles are listed (not the draft MFA article)
- No "New Article" button is visible
- Search box and category filter are present

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 7.2: Browse KB as Agent

**Steps:**
1. Login as `agent1@company.com`
2. Navigate to `/dashboard/kb`

**Expected Results:**
- All 9 articles visible including "Draft: Configuring Multi-Factor Authentication (MFA)"
- Draft article shows a yellow "Draft" badge
- "New Article" button is visible

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 7.3: Search Articles

**Steps:**
1. Login as any user
2. Navigate to `/dashboard/kb`
3. Type "VPN" in the search box (wait ~300ms for debounce)

**Expected Results:**
- Results filter to articles containing "VPN" in title or content
- "Setting Up VPN on Windows" and "Troubleshooting Wi-Fi Connectivity Issues" appear

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 7.4: View Article and Submit Feedback

**Steps:**
1. Login as `employee1@company.com`
2. Open "How to Reset Your Password"
3. Click 👍 **Yes** button

**Expected Results:**
- Helpful count increments by 1
- Button turns green and becomes disabled
- "Thanks for your feedback!" message shown
- Refreshing the page: button remains disabled (localStorage)

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 7.5: Prevent Re-voting

**Steps:**
1. (Continuing from Test 7.4 — already voted)
2. Attempt to click 👎 **No** button

**Expected Results:**
- Both buttons are disabled
- Cannot submit a second vote

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 7.6: Create Article (Agent)

**Steps:**
1. Login as `agent1@company.com`
2. Navigate to `/dashboard/kb` → click **New Article**
3. Fill in:
   - Title: "Test Article"
   - Category: Hardware
   - Content: `# Hello\nThis is **markdown**.`
   - Leave "Published" unchecked
4. Submit

**Expected Results:**
- Redirected to new article view page
- Article shows "Draft" badge
- Markdown rendered (bold text, heading)
- Edit button visible
- Not visible to employees (unpublished)

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 7.7: Edit Article

**Steps:**
1. Login as `agent1@company.com`
2. Open the article created in Test 7.6
3. Click **Edit**
4. Check the **Published** checkbox
5. Save

**Expected Results:**
- Redirected back to article view
- "Draft" badge is gone
- Article now visible to employees

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 7.8: Edit Permission — Agent Cannot Edit Others' Articles

**Steps:**
1. Login as `agent2@company.com`
2. Navigate to the article created by agent1 in Test 7.6
3. Verify no Edit button is shown

**Expected Results:**
- Edit button is NOT visible
- Attempting to navigate directly to `/dashboard/kb/[id]/edit` redirects back to the article view

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 7.9: Admin Can Edit Any Article

**Steps:**
1. Login as `admin@company.com`
2. Open any article not created by admin
3. Click **Edit**, make a minor change, save

**Expected Results:**
- Edit button IS visible
- Changes saved successfully

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 7.10: "Still Need Help?" CTA

**Steps:**
1. Open any KB article
2. Click **"Create a support ticket"** link at the bottom

**Expected Results:**
- Navigates to `/dashboard/issue-logging/new`

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

## Ticket Assignment Tests

### Test 8.1: Employee Cannot See Assign Form

**Steps:**
1. Login as `employee1@company.com`
2. Open one of their tickets (e.g., from My Tickets)
3. Scroll to the Actions panel

**Expected Results:**
- No "Assign Ticket" or "Reassign Ticket" section visible

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 8.2: Agent Can Assign an Unassigned Ticket

**Steps:**
1. Login as `agent1@company.com`
2. Open an unassigned ticket (e.g., from All Tickets)
3. In the Actions panel, locate "Assign Ticket"
4. Select `agent2@company.com` from the dropdown
5. Click **Assign**

**Expected Results:**
- "Assigned Agent" in the Caller Information panel updates to "Michael Chen"
- Section heading changes to "Reassign Ticket"
- Current assignee note appears below the heading

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 8.3: Team Lead Can Reassign a Ticket

**Steps:**
1. Login as `teamlead1@company.com`
2. Open a ticket already assigned to agent1
3. Select `agent3@company.com` from the reassign dropdown
4. Click **Assign**

**Expected Results:**
- Assigned agent updates to "Emily Davis"
- Audit trail recorded (visible in DB)

**Verification:**
```sql
SELECT changes FROM audit_log
WHERE action = 'reassigned'
ORDER BY id DESC LIMIT 1;
```

**Actual Results:**
- Pass/Fail: _____________
- Notes: _______________________________________________

---

### Test 8.4: Assign API Rejects Employees

**Steps:**
1. Login as `employee1@company.com`
2. In DevTools console, run:
```javascript
fetch('/api/tickets/1/assign', {
  method: 'PUT',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ agentId: 3 })
}).then(r => console.log(r.status))
```

**Expected Results:**
- Response status: **403 Forbidden**
- Ticket assignment unchanged

**Actual Results:**
- HTTP Status: _____ (expected: 403)
- Pass/Fail: _____________

---

## Test Data Reference

### Seed Data Summary

The seed script creates the following test data:

#### Users (11 total)
- 1 Admin
- 2 Team Leads
- 3 Agents
- 5 Employees

#### Employees (5)
- John Smith (employee1@company.com) - Engineering
- Jane Doe (employee2@company.com) - Marketing
- Bob Wilson (employee3@company.com) - Sales
- Alice Brown (employee4@company.com) - HR
- Tom Harris (employee5@company.com) - Finance

#### Categories (4)
- Hardware
- Software
- Network
- Access

#### SLA Policies (4)
| Priority | First Response | Resolution |
|----------|----------------|------------|
| P1 | 15 minutes | 4 hours |
| P2 | 1 hour | 24 hours |
| P3 | 4 hours | 72 hours |
| P4 | 24 hours | 7 days |

#### Sample Tickets (18 total)

**P1 Tickets (2):**
- TICK-1001: Server Down - Production Database (In Progress, agent1)
- TICK-1002: CEO Laptop Cannot Boot (Resolved, agent1)

**P2 Tickets (3):**
- TICK-1003: VPN Not Connecting (Open, unassigned)
- TICK-1004: Email Not Sending (In Progress, agent2)
- TICK-1005: Cannot Access Network Shares (Resolved, agent2)

**P3 Tickets (5):**
- TICK-1006: Monitor Flickering (Open, unassigned)
- TICK-1007: Adobe Creative Cloud Request (Resolved, agent3)
- TICK-1008: WiFi Intermittent (In Progress, agent3)
- TICK-1009: Password Reset (Closed, agent1)
- TICK-1010: New Employee Account Setup (In Progress, agent2)

**P4 Tickets (8):**
- TICK-1011: Keyboard Keys Sticking (Open, unassigned)
- TICK-1012: Monitor Stand Request (Resolved, agent3)
- TICK-1013: Office 2021 Update (Resolved, agent1)
- TICK-1014: Shared Folder Access (Resolved, agent2)
- TICK-1015: Printer Default Settings (Open, unassigned)
- TICK-1016: VPN Installation (Closed, agent3)
- TICK-1017: Wireless Mouse Not Working (Resolved, agent1)
- TICK-1018: Email Signature Setup (Resolved, agent2)

### Database Queries for Testing

**View all tickets with SLA status:**
```sql
SELECT
  ticketNumber,
  title,
  status,
  priority,
  impact,
  urgency,
  datetime(createdAt) as created,
  datetime(slaFirstResponseDue) as firstResponseDue,
  datetime(slaResolutionDue) as resolutionDue
FROM tickets
ORDER BY priority, createdAt;
```

**View tickets by priority:**
```sql
SELECT ticketNumber, title, status, priority
FROM tickets
WHERE priority = 'P1'
ORDER BY createdAt;
```

**Check SLA breach status:**
```sql
SELECT
  ticketNumber,
  priority,
  status,
  datetime(slaFirstResponseDue) as firstResponseDue,
  datetime('now') > slaFirstResponseDue as firstResponseBreached,
  datetime(slaResolutionDue) as resolutionDue,
  datetime('now') > slaResolutionDue as resolutionBreached
FROM tickets
WHERE status NOT IN ('Resolved', 'Closed')
ORDER BY priority;
```

**View user permissions:**
```sql
SELECT email, fullName, role, isActive
FROM users
ORDER BY role, fullName;
```

**View ticket assignments:**
```sql
SELECT
  t.ticketNumber,
  t.title,
  t.status,
  u.email as assignedAgent,
  c.email as creator
FROM tickets t
LEFT JOIN users u ON t.assignedAgentId = u.id
JOIN callers c ON t.callerId = c.id
ORDER BY t.status, t.priority;
```

---

## Testing Checklist

Use this checklist to track your testing progress:

### Authentication (7 tests)
- [ ] 1.1 Admin Login
- [ ] 1.2 Team Lead Login
- [ ] 1.3 Agent Login
- [ ] 1.4 Employee Login
- [ ] 1.5 Invalid Credentials
- [ ] 1.6 Session Persistence
- [ ] 1.7 Role-Based UI Differences

### Ticket Creation (7 tests)
- [ ] 2.1 Create P1 Ticket
- [ ] 2.2 Create P2 Ticket
- [ ] 2.3 Create P3 Ticket
- [ ] 2.4 Create P4 Ticket
- [ ] 2.5 Priority Calculation Matrix (9 subtests)
- [ ] 2.6 SLA Due Date Calculations
- [ ] 2.7 Different Categories

### Ticket Status Updates (10 tests)
- [ ] 3.1a Open → In Progress
- [ ] 3.1b In Progress → Resolved
- [ ] 3.1c Resolved → Closed
- [ ] 3.2a Closed → Open (should fail)
- [ ] 3.2b Resolved → Open (should fail)
- [ ] 3.3a Employee Cannot Update Others' Tickets
- [ ] 3.3b Employee Can Update Own Tickets
- [ ] 3.3c Agent Can Update Assigned Tickets
- [ ] 3.3d Team Lead Can Update Any Ticket
- [ ] 3.3e Admin Can Update Any Ticket
- [ ] 3.4a Timestamp: resolvedAt Set
- [ ] 3.4b Timestamp: closedAt Set
- [ ] 3.4c Timestamp: updatedAt Updated

### SLA Tracking (8 tests)
- [ ] 4.1a P1 SLA Policy
- [ ] 4.1b P2 SLA Policy
- [ ] 4.1c P3 SLA Policy
- [ ] 4.1d P4 SLA Policy
- [ ] 4.2a SLA Status - OK
- [ ] 4.2b SLA Status - Warning
- [ ] 4.2c SLA Status - Breached
- [ ] 4.3a First Response Breach
- [ ] 4.3b Resolution Breach

### Permissions (14 tests)
- [ ] 5.1a Employee View Own Tickets
- [ ] 5.1b Employee Cannot View Others' Tickets
- [ ] 5.1c Employee Cannot Assign Tickets
- [ ] 5.1d Employee Cannot Access Admin Sections
- [ ] 5.2a Agent View Assigned Tickets
- [ ] 5.2b Agent Cannot View Unassigned Tickets
- [ ] 5.2c Agent Update Assigned Tickets
- [ ] 5.2d Agent Cannot Update Others' Tickets
- [ ] 5.3a Team Lead View All Tickets
- [ ] 5.3b Team Lead Assign Tickets
- [ ] 5.3c Team Lead Reassign Tickets
- [ ] 5.3d Team Lead View Analytics
- [ ] 5.3e Team Lead Cannot Manage Users
- [ ] 5.4a Admin Manage Users
- [ ] 5.4b Admin Manage Categories
- [ ] 5.4c Admin Manage SLA Policies
- [ ] 5.4d Admin Full Access

### Knowledge Base (10 tests)
- [ ] 7.1 Browse KB as Employee (8 articles, no New button)
- [ ] 7.2 Browse KB as Agent (9 articles with draft, New button)
- [ ] 7.3 Search Articles
- [ ] 7.4 View Article and Submit Feedback
- [ ] 7.5 Prevent Re-voting
- [ ] 7.6 Create Article (Agent)
- [ ] 7.7 Edit Article
- [ ] 7.8 Agent Cannot Edit Others' Articles
- [ ] 7.9 Admin Can Edit Any Article
- [ ] 7.10 "Still Need Help?" CTA

### Ticket Assignment (4 tests)
- [ ] 8.1 Employee Cannot See Assign Form
- [ ] 8.2 Agent Can Assign Unassigned Ticket
- [ ] 8.3 Team Lead Can Reassign Ticket
- [ ] 8.4 Assign API Rejects Employees

---

## Test Summary

**Total Tests:** 60

**Test Distribution:**
- Authentication: 7 tests
- Ticket Creation: 7 tests
- Status Updates: 13 tests
- SLA Tracking: 9 tests
- Permissions: 17 tests
- Knowledge Base: 10 tests
- Ticket Assignment: 4 tests

**Pass/Fail Tracking:**
- Total Passed: _____
- Total Failed: _____
- Pass Rate: _____%

**Critical Issues:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Recommendations:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Notes

- All tests assume the seed script has been run
- Timestamps are in UTC unless otherwise specified
- Database queries use SQLite syntax
- HTTP status codes: 200 (OK), 201 (Created), 403 (Forbidden), 404 (Not Found)
- All "Expected Results" should be verified against actual behavior
- Document any deviations from expected results in the "Notes" section
- For API tests, use tools like Postman, curl, or browser DevTools
- For UI tests, manually test in the browser or use automated testing tools

---

**Testing Date:** _____________

**Tester Name:** _____________

**Application Version:** _____________

**Environment:** Development / Staging / Production (circle one)
