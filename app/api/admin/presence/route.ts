import { NextResponse } from 'next/server';

// Server-side cache for host online state
let globalIsHostOnline = false;

export async function GET() {
  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${backendUrl}/api/presence`, {
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(id);
    if (res.ok) {
      const data = await res.json();
      globalIsHostOnline = !!data.is_online;
      return NextResponse.json(data);
    }
  } catch (e) {
    // Fallback
  }

  return NextResponse.json({
    is_online: globalIsHostOnline,
    status: globalIsHostOnline ? 'Sathyanantham V is Online' : 'AI Digital Twin Active'
  });
}

export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const isOnline = typeof body.is_online === 'boolean' ? body.is_online : true;
  globalIsHostOnline = isOnline;

  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const adminToken = request.headers.get('X-Admin-Token') || 'sathya123';

  try {
    const res = await fetch(`${backendUrl}/api/admin/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken
      },
      body: JSON.stringify({ is_online: isOnline }),
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (e) {
    // Fallback
  }

  return NextResponse.json({
    status: 'success',
    is_online: isOnline,
    message: `Host presence set to ${isOnline ? 'ONLINE' : 'OFFLINE'}`
  });
}
