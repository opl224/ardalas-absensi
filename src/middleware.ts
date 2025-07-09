import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware is intentionally disabled because it's incompatible with `output: 'export'`,
// which is a requirement for building with Capacitor.
// Do not export a `middleware` function from this file.

export const config = {
  matcher: [],
};
