import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ status: 'ERROR', message: 'No file provided in form data' }, { status: 400 });
    }

    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const adminToken = request.headers.get('X-Admin-Token') || 'sathya123';

    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const res = await fetch(`${backendUrl}/api/admin/gdrive-sync/upload`, {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken },
      body: backendFormData,
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    const errorData = await res.json().catch(() => ({}));
    return NextResponse.json(errorData, { status: res.status });
  } catch (error: any) {
    console.warn('Backend GDrive sync upload endpoint error:', error);
    return NextResponse.json({
      status: 'ERROR',
      message: `Failed to upload file: ${error?.message || error}`
    }, { status: 502 });
  }
}
