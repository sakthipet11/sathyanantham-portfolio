import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${backendUrl}/api/portfolio/skills`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Failed to fetch skills from backend database:', error);
  }

  return NextResponse.json({ status: 'error', skills: [] }, { status: 500 });
}
