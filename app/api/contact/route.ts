import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDirectMessageNotification } from '@/lib/email';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('127.0.0.1')) {
    return null;
  }
  try {
    return createClient(url, key);
  } catch (e) {
    console.warn('Error creating Supabase client:', e);
    return null;
  }
}

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

  const { name, email, message, company, budget, purpose } = body;

  if (!name || !email || !message) {
    return NextResponse.json(
      { status: 'error', message: 'name, email, and message are required' },
      { status: 400 }
    );
  }

  // 1. Deliver direct email to Sathyanantham V (v.sathyanantham@gmail.com) via Gmail SMTP
  const emailResult = await sendDirectMessageNotification({
    name,
    email,
    message,
    company: company || '',
    budget: budget || '',
    purpose: purpose || 'Direct Portfolio Inquiry'
  });

  // 2. Persist to Supabase contacts table for dashboard auditing
  let dbSaved = false;
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('contacts').insert([
        {
          name,
          email,
          message,
          company: company || '',
          budget: budget || '',
          purpose: purpose || 'Direct Portfolio Inquiry'
        }
      ]);
      if (!error) {
        dbSaved = true;
      } else {
        console.warn('[Contact Route] Supabase insert warning:', error);
      }
    } catch (dbErr) {
      console.warn('[Contact Route] Supabase exception:', dbErr);
    }
  }

  // 3. Inform FastAPI backend if active (with non-blocking 3s timeout)
  const backendUrl = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.BACKEND_API_URL ||
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '');

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);

    fetch(`${backendUrl}/api/visitor/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'direct-message-sender',
        event_type: 'direct_message_received',
        details: { name, email, company, purpose },
      }),
      signal: controller.signal
    })
      .then(() => clearTimeout(id))
      .catch(() => clearTimeout(id));
  } catch {
    // Ignore backend event dispatch errors
  }

  if (emailResult.success || dbSaved) {
    return NextResponse.json({
      status: 'success',
      message: 'Direct message successfully delivered to Sathyanantham V.',
      emailSent: emailResult.success,
      dbSaved
    });
  }

  return NextResponse.json({
    status: 'error',
    message: emailResult.error || 'Failed to dispatch email. Please contact v.sathyanantham@gmail.com directly.'
  }, { status: 500 });
}
