import { NextResponse } from 'next/server';
import { queryHos } from '@/lib/hosdb';

export async function GET() {
  try {
    const result = await queryHos<{ ok: number }[]>('SELECT 1 as ok');
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('DB Health Check Failed:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}