import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Content Security Policy для блокировки внешних ресурсов
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net", // Monaco Editor CDN
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net", // Monaco Editor styles
    "img-src 'self' data:",
    "font-src 'self' data: https://cdn.jsdelivr.net", // Monaco Editor fonts
    "connect-src 'self' http://localhost:8000 https://llm.t1v.scibox.tech https://cdn.jsdelivr.net", // Monaco Editor worker
    "worker-src 'self' blob: https://cdn.jsdelivr.net", // Monaco Editor web workers
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ")
  
  response.headers.set("Content-Security-Policy", csp)
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}

