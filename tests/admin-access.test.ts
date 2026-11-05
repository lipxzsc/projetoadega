import { expect, test } from "bun:test";

// Teste de integração: credenciais de serviço vêm apenas do ambiente de testes.
test("only the requested Subzero Delivery account has the admin role", async () => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Integration test environment unavailable");
  const headers = new Headers({ apikey: key });
  if (!key.startsWith("sb_")) headers.set("Authorization", `Bearer ${key}`);
  const allUsers: { id: string; email?: string }[] = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${url}/auth/v1/admin/users?per_page=100&page=${page}`, { headers });
    expect(response.ok).toBe(true);
    const { users } = await response.json() as { users: { id: string; email?: string }[] };
    allUsers.push(...users);
    if (users.length < 100) break;
  }
  const userId = allUsers.find((user) => user.email === "lipe.fxp10@gmail.com")?.id;
  expect(userId).toBeDefined();
  if (!userId) return;
  const response = await fetch(`${url}/rest/v1/user_roles?role=eq.admin&select=user_id,role`, { headers });
  expect(response.ok).toBe(true);
  const roles = await response.json() as { user_id: string; role: string }[];
  expect(roles).toEqual([{ user_id: userId, role: "admin" }]);
  expect(allUsers.some((user) => user.email === "adegadokowalski01@gmail.com")).toBe(false);
});