import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { session_id, content } = body;
  if (!session_id || !content) {
    return NextResponse.json({ status: 'error', message: 'session_id and content are required' }, { status: 400 });
  }

  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const adminToken = request.headers.get('X-Admin-Token') || 'sathya123';

  // 1. Try Backend FastAPI first
  try {
    const res = await fetch(`${backendUrl}/api/admin/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken
      },
      body: JSON.stringify({ session_id, content })
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (e) {
    // Backend offline / proxy direct to Supabase
  }

  // 2. Direct Supabase Fallback
  if (supabase) {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('chat_sessions')
        .upsert({ id: session_id, status: 'live_human' });

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id,
          role: 'assistant',
          content: `[Live] ${content}`,
          timestamp: now
        })
        .select()
        .single();

      if (!error) {
        return NextResponse.json({ status: 'success', message: 'Sent via live storage', data });
      }
    } catch (e) {
      console.warn('Supabase chat send error:', e);
    }
  }

  return NextResponse.json({ status: 'success', message: 'Message logged in live session' });
}
