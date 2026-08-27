import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let reqBody: any = {};
  try {
    reqBody = await request.json();
  } catch {}

  const url = new URL(request.url);
  const folderUrl = reqBody.folder_url || url.searchParams.get('folder_url') || 'https://drive.google.com/drive/u/1/folders/1AtZo2n7TYsavZrw6cG1quek3je0K3hkO';
  const dateStr = reqBody.date_str || url.searchParams.get('date_str') || '';

  try {
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const adminToken = request.headers.get('X-Admin-Token') || 'sathya123';

    const params = new URLSearchParams();
    if (folderUrl) params.append('folder_url', folderUrl);
    if (dateStr) params.append('date_str', dateStr);

    const res = await fetch(`${backendUrl}/api/admin/gdrive-sync/run?${params.toString()}`, {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken },
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    const errorData = await res.json().catch(() => ({}));
    return NextResponse.json(errorData, { status: res.status });
  } catch (error: any) {
    console.warn('Backend GDrive sync run endpoint error:', error);
    return NextResponse.json({
      status: 'ERROR',
      message: `Failed to connect to sync backend: ${error?.message || error}`,
      folder_url: folderUrl
    }, { status: 502 });
  }
}

