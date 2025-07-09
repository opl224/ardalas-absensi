import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware is disabled because it's incompatible with `output: 'export'`
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
