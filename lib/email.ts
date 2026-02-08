/**
 * Email notification service
 * Uses Resend for transactional emails
 */

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'IT Help Desk <noreply@helpdesk.example.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Send email with error handling and logging
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  // In development, just log the email
  if (!resend || !process.env.RESEND_API_KEY) {
    console.log('📧 [EMAIL MOCK] To:', to);
    console.log('📧 [EMAIL MOCK] Subject:', subject);
    console.log('📧 [EMAIL MOCK] Body:', html.substring(0, 200) + '...');
    return true;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html
    });
    console.log('✅ Email sent to:', to);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email to:', to, error);
    return false;
  }
}

/**
 * Email sent when a new ticket is created
 */
export async function sendTicketCreatedEmail(
  to: string,
  ticketNumber: string,
  title: string,
  priority: string,
  ticketId: number
): Promise<boolean> {
  const ticketUrl = `${APP_URL}/tickets/${ticketId}`;
  const slaText = getSlaText(priority);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-number { font-size: 24px; font-weight: bold; margin: 0; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge-p1 { background: #fee2e2; color: #991b1b; }
          .badge-p2 { background: #fef3c7; color: #92400e; }
          .badge-p3 { background: #dbeafe; color: #1e40af; }
          .badge-p4 { background: #d1fae5; color: #065f46; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .info-label { font-weight: bold; width: 140px; color: #374151; }
          .info-value { color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">Ticket Created</p>
            <p class="ticket-number">${ticketNumber}</p>
          </div>
          <div class="content">
            <h2 style="margin-top: 0;">Your ticket has been created</h2>
            <p>Your support ticket has been successfully created and added to the queue. You will receive updates as your ticket progresses.</p>

            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <div class="info-row">
                <span class="info-label">Subject:</span>
                <span class="info-value">${title}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Priority:</span>
                <span class="info-value"><span class="badge badge-${priority.toLowerCase()}">${priority}</span></span>
              </div>
              <div class="info-row">
                <span class="info-label">Expected Response:</span>
                <span class="info-value">${slaText}</span>
              </div>
            </div>

            <a href="${ticketUrl}" class="button">View Ticket</a>

            <div class="footer">
              <p>This is an automated message from IT Help Desk. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, `Ticket ${ticketNumber} Created - ${title}`, html);
}

/**
 * Email sent when a ticket is assigned to an agent
 */
export async function sendTicketAssignedEmail(
  to: string,
  ticketNumber: string,
  title: string,
  priority: string,
  ticketId: number,
  assignedBy: string
): Promise<boolean> {
  const ticketUrl = `${APP_URL}/tickets/${ticketId}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-number { font-size: 24px; font-weight: bold; margin: 0; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge-p1 { background: #fee2e2; color: #991b1b; }
          .badge-p2 { background: #fef3c7; color: #92400e; }
          .badge-p3 { background: #dbeafe; color: #1e40af; }
          .badge-p4 { background: #d1fae5; color: #065f46; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">New Assignment</p>
            <p class="ticket-number">${ticketNumber}</p>
          </div>
          <div class="content">
            <h2 style="margin-top: 0;">You have been assigned a new ticket</h2>
            <p>${assignedBy} has assigned this ticket to you. Please review and begin working on it.</p>

            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">${title}</p>
              <p style="margin: 0;"><span class="badge badge-${priority.toLowerCase()}">${priority} Priority</span></p>
            </div>

            <a href="${ticketUrl}" class="button">View & Start Working</a>

            <div class="footer">
              <p>This is an automated message from IT Help Desk.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, `New Assignment: ${ticketNumber}`, html);
}

/**
 * Email sent when a ticket status changes
 */
export async function sendTicketStatusUpdateEmail(
  to: string,
  ticketNumber: string,
  title: string,
  oldStatus: string,
  newStatus: string,
  comment: string | null,
  ticketId: number
): Promise<boolean> {
  const ticketUrl = `${APP_URL}/tickets/${ticketId}`;
  const statusColor = getStatusColor(newStatus);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-number { font-size: 24px; font-weight: bold; margin: 0; }
          .status-change { background: white; border-radius: 8px; padding: 15px; margin: 20px 0; display: flex; align-items: center; justify-content: center; gap: 15px; }
          .old-status { background: #e5e7eb; padding: 8px 16px; border-radius: 4px; font-weight: bold; }
          .new-status { background: #10b981; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; }
          .arrow { font-size: 20px; color: #6b7280; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
          .comment { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; font-style: italic; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">Status Update</p>
            <p class="ticket-number">${ticketNumber}</p>
          </div>
          <div class="content">
            <h2 style="margin-top: 0;">Your ticket status has changed</h2>

            <div class="status-change">
              <span class="old-status">${oldStatus}</span>
              <span class="arrow">→</span>
              <span class="new-status">${newStatus}</span>
            </div>

            <p><strong>${title}</strong></p>

            ${comment ? `<div class="comment">"${comment}"</div>` : ''}

            <a href="${ticketUrl}" class="button">View Ticket</a>

            <div class="footer">
              <p>This is an automated message from IT Help Desk.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, `Update: ${ticketNumber} is now ${newStatus}`, html);
}

/**
 * Email sent when a ticket is resolved
 */
export async function sendTicketResolvedEmail(
  to: string,
  ticketNumber: string,
  title: string,
  resolution: string,
  ticketId: number
): Promise<boolean> {
  const ticketUrl = `${APP_URL}/tickets/${ticketId}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-number { font-size: 24px; font-weight: bold; margin: 0; }
          .resolution-box { background: white; border-left: 4px solid #10b981; padding: 20px; border-radius: 4px; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px 0 0; }
          .button-secondary { background: #10b981; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">Ticket Resolved</p>
            <p class="ticket-number">${ticketNumber}</p>
          </div>
          <div class="content">
            <h2 style="margin-top: 0; color: #10b981;">✓ Your ticket has been resolved</h2>
            <p>Your ticket <strong>${title}</strong> has been marked as resolved by our support team.</p>

            <div class="resolution-box">
              <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Resolution:</p>
              <p style="margin: 0; color: #6b7280;">${resolution}</p>
            </div>

            <p>Please verify that your issue has been resolved. If you're still experiencing problems, you can reopen the ticket.</p>

            <div>
              <a href="${ticketUrl}" class="button">View Ticket</a>
              <a href="${ticketUrl}?reopen=true" class="button button-secondary">Reopen if Needed</a>
            </div>

            <div class="footer">
              <p>This is an automated message from IT Help Desk.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, `Resolved: ${ticketNumber}`, html);
}

/**
 * Email sent when an SLA breach is detected
 */
export async function sendSLABreachEmail(
  to: string,
  ticketNumber: string,
  title: string,
  priority: string,
  breachType: 'first_response' | 'resolution',
  slaDue: Date
): Promise<boolean> {
  const ticketUrl = `${APP_URL}/tickets/${ticketNumber}`;
  const breachText = breachType === 'first_response' ? 'First Response' : 'Resolution';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert { background: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .alert-icon { font-size: 48px; margin-bottom: 10px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #fee2e2; color: #991b1b; }
          .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
          .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .info-label { font-weight: bold; width: 140px; color: #374151; }
          .info-value { color: #6b7280; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">⚠️ SLA Breach Alert</p>
            <p class="ticket-number">${ticketNumber}</p>
          </div>
          <div class="content">
            <div class="alert">
              <div class="alert-icon">⚠️</div>
              <h2 style="margin: 0; color: #991b1b;">SLA Breached!</h2>
              <p style="margin: 5px 0 0 0; color: #dc2626;">${breachText} deadline has passed</p>
            </div>

            <p>The following ticket has breached its Service Level Agreement. Please investigate immediately.</p>

            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <div class="info-row">
                <span class="info-label">Subject:</span>
                <span class="info-value">${title}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Priority:</span>
                <span class="info-value"><span class="badge">${priority}</span></span>
              </div>
              <div class="info-row">
                <span class="info-label">SLA Due:</span>
                <span class="info-value">${slaDue.toLocaleString()}</span>
              </div>
            </div>

            <a href="${ticketUrl}" class="button">Take Action Now</a>

            <div class="footer">
              <p>This is an automated SLA monitoring alert from IT Help Desk.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, `🚨 SLA Breach: ${ticketNumber}`, html);
}

/**
 * Email sent for SLA warning (approaching deadline)
 */
export async function sendSLAWarningEmail(
  to: string,
  ticketNumber: string,
  title: string,
  priority: string,
  breachType: 'first_response' | 'resolution',
  slaDue: Date,
  timeRemaining: string
): Promise<boolean> {
  const ticketUrl = `${APP_URL}/tickets/${ticketNumber}`;
  const breachText = breachType === 'first_response' ? 'First Response' : 'Resolution';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .warning-icon { font-size: 48px; margin-bottom: 10px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #fef3c7; color: #92400e; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">⏰ SLA Warning</p>
            <p class="ticket-number">${ticketNumber}</p>
          </div>
          <div class="content">
            <div class="warning">
              <div class="warning-icon">⏰</div>
              <h2 style="margin: 0; color: #92400e;">SLA Deadline Approaching</h2>
              <p style="margin: 5px 0 0 0; color: #b45309;">${breachText} due in ${timeRemaining}</p>
            </div>

            <p>The following ticket is approaching its SLA deadline. Please prioritize accordingly.</p>

            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">${title}</p>
              <p style="margin: 0;"><span class="badge">${priority}</span></p>
              <p style="margin: 10px 0 0 0; color: #6b7280;">Due: ${slaDue.toLocaleString()}</p>
            </div>

            <a href="${ticketUrl}" class="button">View Ticket</a>

            <div class="footer">
              <p>This is an automated SLA monitoring alert from IT Help Desk.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, `⏰ SLA Warning: ${ticketNumber}`, html);
}

/**
 * Helper function to get SLA text for priority
 */
function getSlaText(priority: string): string {
  const slaTexts: Record<string, string> = {
    P1: '15 minutes (Critical)',
    P2: '1 hour (High)',
    P3: '4 hours (Medium)',
    P4: '24 hours (Low)'
  };
  return slaTexts[priority] || 'TBD';
}

/**
 * Helper function to get status color
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    New: '#3b82f6',
    Assigned: '#8b5cf6',
    InProgress: '#f59e0b',
    Pending: '#6b7280',
    Resolved: '#10b981',
    Closed: '#6b7280'
  };
  return colors[status] || '#667eea';
}
