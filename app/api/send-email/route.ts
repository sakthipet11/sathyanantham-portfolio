import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

const SMTP_SERVER = process.env.EMAIL_SMTP_SERVER || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.EMAIL_SMTP_PORT || '465', 10);
const EMAIL_ADDRESS = (process.env.EMAIL_ADDRESS || 'v.sathyanantham@gmail.com').trim();
const EMAIL_APP_PASSWORD = (process.env.EMAIL_APP_PASSWORD || 'qhvllsexeewpgpww').trim();

export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const to = (body.to || body.recipient_email || '').trim();
  const subject = (body.subject || '').trim() || 'Message from Sathyanantham V - AI Studio';
  const textContent = (body.body || body.cover_letter || body.message || '').trim();
  const resumeFileName = body.resume_file_name || '';
  const applicationId = body.application_id || '';

  if (!to) {
    return NextResponse.json(
      { status: 'error', message: "Recipient email ('to' or 'recipient_email') is required" },
      { status: 400 }
    );
  }

  // 1. Try forwarding to FastAPI backend if available
  const backendUrl = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.BACKEND_API_URL ||
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '');

  try {
    const targetEndpoint = applicationId
      ? `${backendUrl}/api/v2/applications/${applicationId}/send-email`
      : `${backendUrl}/send-email`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const backendRes = await fetch(targetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: applicationId || undefined,
        recipient_email: to,
        to: to,
        subject: subject,
        cover_letter: textContent,
        body: textContent,
        resume_file_name: resumeFileName || undefined
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json({
        status: 'success',
        success: true,
        source: 'backend_service',
        ...data
      });
    }
  } catch (backendErr) {
    console.warn('[API/send-email] Backend forward failed or timed out, falling back to local nodemailer:', backendErr);
  }

  // 2. Direct Nodemailer fallback
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_SERVER,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: EMAIL_ADDRESS,
        pass: EMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const attachments: any[] = [];
    if (resumeFileName) {
      const candidatePaths = [
        path.join(process.cwd(), 'public', 'downloads', resumeFileName),
        path.join(process.cwd(), 'public', resumeFileName),
        path.join(process.cwd(), 'public', 'downloads', 'Sathyanantham_V_Frontend_Architect_2026.pdf')
      ];
      for (const cp of candidatePaths) {
        if (fs.existsSync(cp)) {
          attachments.push({
            filename: path.basename(cp),
            path: cp
          });
          break;
        }
      }
    }

    const info = await transporter.sendMail({
      from: `"Sathyanantham V" <${EMAIL_ADDRESS}>`,
      to: to,
      subject: subject,
      text: textContent || 'Hello,\n\nPlease find the attached application materials from Sathyanantham V.',
      attachments: attachments.length > 0 ? attachments : undefined
    });

    return NextResponse.json({
      status: 'success',
      success: true,
      source: 'nodemailer_direct',
      message: `Successfully sent email to ${to}`,
      messageId: info.messageId,
      attachments: attachments.map(a => a.filename)
    });
  } catch (smtpErr: any) {
    console.error('[API/send-email] Nodemailer fallback error:', smtpErr);
    return NextResponse.json(
      { status: 'error', message: smtpErr.message || 'Failed to dispatch email' },
      { status: 500 }
    );
  }
}
