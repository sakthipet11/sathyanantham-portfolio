import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const res = await fetch(`${backendUrl}/api/v2/jobs/metrics`, {
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.warn('Backend metrics endpoint offline:', error);
  }

  return NextResponse.json({
    status: 'success',
    metrics: {
      jobs_found: 0,
      new_jobs: 0,
      profile_matches: 0,
      jd_matches: 0,
      top_match_score: 95.0,
      remote_jobs: 0
    }
  });
}
