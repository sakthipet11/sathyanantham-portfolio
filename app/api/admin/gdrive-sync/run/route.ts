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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    let res: Response;
    try {
      res = await fetch(`${backendUrl}/api/admin/gdrive-sync/run?${params.toString()}`, {
        method: 'POST',
        headers: { 'X-Admin-Token': adminToken },
        cache: 'no-store',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    const errorData = await res.json().catch(() => ({}));
    return NextResponse.json({
      status: errorData.status || 'ERROR',
      message: errorData.message || errorData.detail || `Sync service responded with status ${res.status}`,
      jobs_processed: 0,
      folder_url: folderUrl
    }, { status: 200 });
  } catch (error: any) {
    console.warn('Backend GDrive sync run endpoint error/timeout:', error);
    const todayStr = new Date().toISOString().split('T')[0];
    const isTimeout = error?.name === 'AbortError';

    return NextResponse.json({
      status: 'NOT_FOUND',
      message: isTimeout
        ? 'Google Drive Sync timed out while scanning the folder. Please verify the folder link sharing is set to "Anyone with the link can view", or use "Upload / Drop Excel" for instant processing.'
        : `Google Drive Sync: Backend service unreachable. Make sure the API server is running, or upload an Excel tracker file directly.`,
      folder_url: folderUrl,
      file_name: `job_tracker_${todayStr}.xlsx`,
      jobs_processed: 0,
      last_run: new Date().toISOString()
    }, { status: 200 });
  }
}

