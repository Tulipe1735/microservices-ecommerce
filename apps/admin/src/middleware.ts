import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { CustomJwtSessionClaims } from "@repo/types";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/unauthorized(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }

  await auth.protect();

  const { userId, sessionClaims } = await auth();

  if (userId && sessionClaims) {
    const userRole = (sessionClaims as CustomJwtSessionClaims).metadata?.role;

    if (userRole !== "admin") {
      return Response.redirect(new URL("/unauthorized", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
