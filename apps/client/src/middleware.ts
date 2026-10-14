import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const authenticate = clerkMiddleware();

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // Stripe requests are authenticated by their signature in the payment service.
  if (request.nextUrl.pathname === "/api/stripe-webhook")
    return NextResponse.next();
  return authenticate(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
