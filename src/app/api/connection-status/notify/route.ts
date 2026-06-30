import { NextResponse } from 'next/server';
import { ENV } from '@/config/env';

export async function GET() {
  try {
    if (!ENV.lineNotifyTestClientKey || !ENV.lineNotifyTestSecretKey) {
      return NextResponse.json({ status: 'missing_config' }, { status: 400 });
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}