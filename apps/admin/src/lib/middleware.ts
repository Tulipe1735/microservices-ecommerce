import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { CustomJwtSessionClaims } from "@repo/types";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/unauthorized(.*)"]); //后缀跟什么都可以跳转

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect(); //未登录时去登录页

    const { userId, sessionClaims } = await auth();

    if (userId && sessionClaims) {
      const userRole = (sessionClaims as CustomJwtSessionClaims).metadata?.role;
      if (userRole !== "admin") {
        return Response.redirect(new URL("/unauthorized", req.url)); //user会被重定向
      }
    }
  }
});
