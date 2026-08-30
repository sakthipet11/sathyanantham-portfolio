import { NextResponse } from 'next/server';

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
      return NextResponse.json(data);
    }
  } catch (e) {
    // Fallback
  }

  return NextResponse.json({
    is_online: false,
    status: 'AI Digital Twin Active'
  });
}
