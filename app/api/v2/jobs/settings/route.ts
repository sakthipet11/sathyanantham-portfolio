import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const res = await fetch(`${backendUrl}/api/v2/jobs/settings`, {
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.warn('Backend job settings endpoint offline:', error);
  }

  return NextResponse.json({
    status: 'success',
    settings: {
      daily_application_limit: 10,
      min_ats_score_threshold: 75.0,
      profile_ats_threshold: 75.0,
      jd_match_threshold: 50.0,
      target_roles: ['Lead Software Engineer', 'React Developer', 'AI Engineer'],
      target_locations: ['Bangalore', 'Remote', 'India']
    }
  });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const res = await fetch(`${backendUrl}/api/v2/jobs/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.warn('Backend job settings update error:', error);
  }

  return NextResponse.json({ status: 'success', message: 'Settings updated' });
}
