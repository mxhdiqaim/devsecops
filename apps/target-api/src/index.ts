import { Elysia } from "elysia";
import { rawClient, rawUnsafe } from "@repo/db";

const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";
const AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

const port = parseInt(process.env.PORT || "4000", 10);

const app = new Elysia();

app.get("/", () => ({
  status: "ok",
  app: "target-api",
  key: AWS_ACCESS_KEY_ID
}));

app.get("/users", async ({ query, set }) => {
  const email = query.email ?? "";

  const rawSql = `SELECT id, email, password FROM users WHERE email = '${email}'`;

  try {
    const result = await rawClient.unsafe(rawSql);
    return {
      query: rawSql,
      users: result
    };
  } catch (err: any) {
    set.status = 500;
    return {
      query: rawSql,
      error: err?.message || String(err)
    };
  }
});

app.get("/echo", ({ query, set }) => {
  const html = query.html ?? "";
  set.headers["Content-Type"] = "text/html; charset=utf-8";
  return html;
});

app.listen(port, () => {
  console.log(`target-api is running on http://localhost:${port}`);
});

export default app;
