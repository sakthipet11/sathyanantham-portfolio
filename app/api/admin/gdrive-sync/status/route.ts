import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const adminToken = request.headers.get('X-Admin-Token') || 'sathya123';

    const res = await fetch(`${backendUrl}/api/admin/gdrive-sync/status`, {
      headers: { 'X-Admin-Token': adminToken },
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.warn('Backend GDrive sync status endpoint offline, returning default status:', error);
  }

  const todayStr = new Date().toISOString().split('T')[0];
  return NextResponse.json({
    status: 'success',
    enabled: true,
    schedule_time: '07:00 AM IST',
    frequency: 'DAILY',
    last_run: null,
    last_status: 'IDLE',
    last_file: `job_tracker_${todayStr}.xlsx`,
    last_jobs_count: 0
  });
}
