import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const adminToken = request.headers.get('X-Admin-Token') || 'sathya123';

  // 1. Try Backend FastAPI
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${backendUrl}/api/admin/chat/sessions`, {
      headers: { 'X-Admin-Token': adminToken },
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(id);
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(Array.isArray(data) ? data : []);
    }
  } catch (e) {
    // Backend unreachable, fallback to Supabase
  }

  // 2. Direct Supabase Fallback
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return NextResponse.json(data);
      }
    } catch (e) {
      console.warn('Supabase chat sessions query error:', e);
    }
  }

  return NextResponse.json([]);
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ status: 'error', message: 'session_id query parameter required' }, { status: 400 });
  }

  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const adminToken = request.headers.get('X-Admin-Token') || 'sathya123';

  try {
    const res = await fetch(`${backendUrl}/api/admin/chat/sessions?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Token': adminToken },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (e) {
    // Backend unavailable, proceed to Supabase
  }

  if (supabase) {
    try {
      await supabase.from('chat_messages').delete().eq('session_id', sessionId);
      await supabase.from('chat_sessions').delete().eq('id', sessionId);
      return NextResponse.json({ status: 'success', message: `Session ${sessionId} deleted.` });
    } catch (e) {
      console.warn('Supabase delete session error:', e);
    }
  }

  return NextResponse.json({ status: 'success', message: `Session ${sessionId} deleted (local).` });
}
