import { getAuth } from "@hono/clerk-auth";
import { createMiddleware } from "hono/factory";
import { CustomJwtSessionClaims } from "@repo/types";

export const shouldBeUser = createMiddleware<{
  Variables: {
    userId: string; //ts里标注输入变量类型
  };
}>(async (c, next) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    return c.json({
      message: "You are not logged in.", //登录失败情况
    });
  }

  c.set("userId", auth.userId); //登录成功后设置userId

  await next(); //继续执行后面的接口
});
export const shouldBeAdmin = createMiddleware<{
  Variables: {
    userId: string;
  };
}>(async (c, next) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    return c.json({
      message: "You are not logged in.",
    });
  }

  const claims = auth.sessionClaims as CustomJwtSessionClaims;

  if (claims.metadata?.role !== "admin") {
    return c.json({ message: "Unauthorized!" });
  }

  c.set("userId", auth.userId);

  await next();
});
