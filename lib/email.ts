import nodemailer from 'nodemailer';

export interface DirectMessagePayload {
  name: string;
  email: string;
  message: string;
  company?: string;
  budget?: string;
  purpose?: string;
}

const SMTP_SERVER = process.env.EMAIL_SMTP_SERVER || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.EMAIL_SMTP_PORT || '465', 10);
const EMAIL_ADDRESS = (process.env.EMAIL_ADDRESS || 'v.sathyanantham@gmail.com').trim();
const EMAIL_APP_PASSWORD = (process.env.EMAIL_APP_PASSWORD || 'qhvllsexeewpgpww').trim();
const NOTIFICATION_EMAIL = (process.env.NOTIFICATION_EMAIL || 'v.sathyanantham@gmail.com').trim();

/**
 * Creates an authenticated nodemailer transporter for Gmail SMTP.
 * Tries port 465 (SSL) with automatic fallback.
 */
function createTransporter(port = SMTP_PORT) {
  return nodemailer.createTransport({
    host: SMTP_SERVER,
    port: port,
    secure: port === 465,
    auth: {
      user: EMAIL_ADDRESS,
      pass: EMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Sends direct message notifications:
 * 1. Rich notification to Sathyanantham V (v.sathyanantham@gmail.com)
 * 2. Courteous acknowledgment confirmation to the inquirer (from v.sathyanantham@gmail.com)
 */
export async function sendDirectMessageNotification(payload: DirectMessagePayload): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const { name, email, message, company = '', budget = '', purpose = 'Direct Portfolio Inquiry' } = payload;
  const nowUtc = new Date().toUTCString();

  const adminSubject = `[Direct Message] Inquiry from ${name}${company ? ` (${company})` : ''}`;

  const adminHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px; color: #e2e8f0; }
      .container { max-width: 620px; margin: 0 auto; background: #111827; border-radius: 16px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px 32px; border-bottom: 1px solid #334155; }
      .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #38bdf8; letter-spacing: -0.5px; }
      .header p { margin: 4px 0 0 0; color: #94a3b8; font-size: 12px; font-family: monospace; }
      .content { padding: 32px; font-size: 14px; line-height: 1.6; }
      .field { margin-bottom: 18px; }
      .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.8px; margin-bottom: 4px; font-family: monospace; }
      .value { font-size: 15px; color: #f8fafc; font-weight: 500; }
      .quote-box { background: #1e293b; border-left: 4px solid #38bdf8; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1; white-space: pre-wrap; }
      .btn { display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 14px; }
      .footer { border-top: 1px solid #1f2937; padding: 18px 32px; font-size: 12px; color: #64748b; background: #0b0f19; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Direct Portfolio Message</h1>
        <p>// TRANSMITTED VIA SATHYANANTHAM AI STUDIO // ${nowUtc}</p>
      </div>
      <div class="content">
        <div class="field">
          <div class="label">// Sender Name</div>
          <div class="value">${name}</div>
        </div>
        <div class="field">
          <div class="label">// Email Address</div>
          <div class="value"><a href="mailto:${email}" style="color: #38bdf8; text-decoration: none;">${email}</a></div>
        </div>
        ${company ? `<div class="field"><div class="label">// Company / Organization</div><div class="value">${company}</div></div>` : ''}
        ${purpose ? `<div class="field"><div class="label">// Project Scope / Purpose</div><div class="value">${purpose}</div></div>` : ''}
        ${budget ? `<div class="field"><div class="label">// Budget Range</div><div class="value">${budget}</div></div>` : ''}
        <div class="field">
          <div class="label">// Message Content</div>
          <div class="quote-box">${message}</div>
        </div>
        <a href="mailto:${email}?subject=Re: Portfolio Inquiry" class="btn">Reply Directly to ${name} &rarr;</a>
      </div>
      <div class="footer">
        Intended for Sathyanantham V &bull; Lead Software Engineer & AI Architect<br>
        v.sathyanantham@gmail.com &bull; Coimbatore, Tamil Nadu, India
      </div>
    </div>
  </body>
  </html>
  `.trim();

  const adminText = `
New Portfolio Direct Message
============================
Time: ${nowUtc}
Sender: ${name} (${email})
Company: ${company || 'N/A'}
Scope / Purpose: ${purpose || 'Direct Portfolio Inquiry'}
Budget: ${budget || 'N/A'}

Message:
${message}

Reply to: ${email}
  `.trim();

  let adminDeliveryId: string | undefined;

  // 1. Dispatch notification to Sathyanantham V (v.sathyanantham@gmail.com)
  try {
    let transporter = createTransporter(465);
    try {
      const info = await transporter.sendMail({
        from: `"Sathyanantham Portfolio" <${EMAIL_ADDRESS}>`,
        to: NOTIFICATION_EMAIL,
        replyTo: email,
        subject: adminSubject,
        text: adminText,
        html: adminHtml,
      });
      adminDeliveryId = info.messageId;
      console.log(`[SMTP-Next] Email delivered to ${NOTIFICATION_EMAIL} on port 465 (id: ${info.messageId})`);
    } catch (sslErr) {
      console.warn('[SMTP-Next] Port 465 failed, retrying on port 587 STARTTLS:', sslErr);
      transporter = createTransporter(587);
      const info = await transporter.sendMail({
        from: `"Sathyanantham Portfolio" <${EMAIL_ADDRESS}>`,
        to: NOTIFICATION_EMAIL,
        replyTo: email,
        subject: adminSubject,
        text: adminText,
        html: adminHtml,
      });
      adminDeliveryId = info.messageId;
      console.log(`[SMTP-Next] Email delivered to ${NOTIFICATION_EMAIL} on port 587 (id: ${info.messageId})`);
    }
  } catch (err: any) {
    console.error(`[SMTP-Next] Failed to send email to ${NOTIFICATION_EMAIL}:`, err);
    return { success: false, error: err?.message || 'SMTP transmission error' };
  }

  // 2. Dispatch polite confirmation receipt to the visitor
  try {
    const confirmationSubject = 'Message Received — Sathyanantham V';
    const confirmationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 24px 32px; color: #ffffff; }
        .header h1 { margin: 0; font-size: 18px; font-weight: 700; color: #38bdf8; }
        .content { padding: 28px 32px; font-size: 14px; line-height: 1.6; color: #334155; }
        .quote-box { background: #f8fafc; border-left: 3px solid #0284c7; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #475569; }
        .footer { border-top: 1px solid #e2e8f0; padding: 18px 32px; font-size: 12px; color: #94a3b8; background: #fafafa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Transmission Received</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Thank you for reaching out through my portfolio. I have received your message and will review your inquiry shortly.</p>
          <div class="quote-box">
            <strong>Your inquiry:</strong><br>
            ${message}
          </div>
          <p>Best regards,<br>
          <strong>Sathyanantham V</strong><br>
          <span style="font-size: 12px; color: #64748b;">Lead Software Engineer & Frontend Architect</span><br>
          <span style="font-size: 12px; color: #64748b;">v.sathyanantham@gmail.com | +91 8870956756</span></p>
        </div>
        <div class="footer">
          Sathyanantham AI Studio &bull; Coimbatore, Tamil Nadu, India
        </div>
      </div>
    </body>
    </html>
    `.trim();

    const transporter = createTransporter(SMTP_PORT);
    await transporter.sendMail({
      from: `"Sathyanantham V" <${EMAIL_ADDRESS}>`,
      to: email,
      replyTo: NOTIFICATION_EMAIL,
      subject: confirmationSubject,
      text: `Hi ${name},\n\nThank you for reaching out through my portfolio. I have received your direct message and will review your inquiry shortly.\n\nSummary of your message:\n${message}\n\nBest regards,\nSathyanantham V\nLead Software Engineer & Frontend Architect\nv.sathyanantham@gmail.com | +91 8870956756`,
      html: confirmationHtml,
    });
    console.log(`[SMTP-Next] Confirmation receipt delivered to inquirer ${email}`);
  } catch (confirmErr) {
    // Non-fatal if confirmation receipt cannot be delivered to visitor
    console.warn(`[SMTP-Next] Confirmation receipt delivery to ${email} warning:`, confirmErr);
  }

  return { success: true, messageId: adminDeliveryId };
}
