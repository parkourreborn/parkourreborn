import { NextRequest, NextResponse } from 'next/server';
import { checkMemoryLimit, clientKey } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const maxBytes = 16 * 1024;
const done = () => new NextResponse(null, { status: 204 });

// Only the origin of a URL is logged, so query strings and paths that might
// carry personal data never reach the logs.
const originOf = (value: unknown) => {
  if (typeof value !== 'string' || !value) return '';
  try {
    return new URL(value).origin;
  } catch {
    return value.slice(0, 40);
  }
};

const pathOf = (value: unknown) => {
  if (typeof value !== 'string') return '';
  try {
    return new URL(value).pathname.slice(0, 120);
  } catch {
    return '';
  }
};

// Collects Content-Security-Policy-Report-Only violations in the server logs
// so the policy can be tightened and then enforced.
export async function POST(request: NextRequest) {
  if (!checkMemoryLimit(`csp-report:${clientKey(request.headers)}`, [{ seconds: 60, max: 10 }]).ok) return done();
  if (!checkMemoryLimit('csp-report:all', [{ seconds: 60, max: 200 }]).ok) return done();
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) return done();

  const raw = await request.text().catch(() => '');
  if (!raw || raw.length > maxBytes) return done();

  try {
    const body = JSON.parse(raw) as { 'csp-report'?: Record<string, unknown> };
    const report = body['csp-report'];
    if (!report || typeof report !== 'object') return done();

    console.warn('csp violation', {
      page: pathOf(report['document-uri']),
      directive: String(report['effective-directive'] || report['violated-directive'] || '').slice(0, 60),
      blocked: originOf(report['blocked-uri']),
      source: originOf(report['source-file']),
    });
  } catch {
    // Malformed reports are ignored.
  }

  return done();
}
