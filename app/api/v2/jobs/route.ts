import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    
    const queryStr = searchParams.toString();
    const targetUrl = `${backendUrl}/api/v2/jobs${queryStr ? `?${queryStr}` : ''}`;

    const res = await fetch(targetUrl, {
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.warn('Backend jobs list endpoint offline, returning empty jobs payload:', error);
  }

  return NextResponse.json({
    status: 'success',
    count: 0,
    jobs: []
  });
}
