// This file is intentionally left blank to disable middleware,
// as it's not compatible with `output: 'export'` for Capacitor builds.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware is disabled because it's incompatible with `output: 'export'`
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
