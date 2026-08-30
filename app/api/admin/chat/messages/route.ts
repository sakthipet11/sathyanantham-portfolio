import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json([]);
  }

  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const adminToken = request.headers.get('X-Admin-Token') || 'sathya123';

  // 1. Try Backend FastAPI
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${backendUrl}/api/admin/chat/messages?session_id=${encodeURIComponent(sessionId)}`, {
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
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (!error && Array.isArray(data)) {
        return NextResponse.json(data);
      }
    } catch (e) {
      console.warn('Supabase chat messages query error:', e);
    }
  }

  return NextResponse.json([]);
}
