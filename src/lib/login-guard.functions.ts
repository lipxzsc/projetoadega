/**
 * PROTEÇÃO CONTRA FORÇA BRUTA NO LOGIN (executa só no servidor).
 *
 * Como funciona:
 *  - Cada tentativa é registrada na tabela `login_attempts`.
 *  - Guardamos apenas o HASH SHA-256 do e-mail (nunca o e-mail em texto),
 *    então nem quem tiver acesso ao banco descobre quem tentou entrar.
 *  - Após MAX_ATTEMPTS falhas dentro de WINDOW_MINUTES, o login é bloqueado
 *    temporariamente. Um login bem-sucedido zera o contador.
 *
 * Para afrouxar/apertar a regra, mude apenas as duas constantes abaixo.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MAX_ATTEMPTS = 5;      // falhas permitidas na janela
const WINDOW_MINUTES = 15;   // tamanho da janela de contagem

const emailSchema = z.object({ email: z.string().trim().email().max(255) });

/** SHA-256 do e-mail normalizado (Web Crypto — disponível no runtime do servidor). */
async function hashEmail(email: string): Promise<string> {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function windowStart(): string {
  return new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
}

/** Verifica se o e-mail pode tentar logar agora. */
export const checkLoginAllowed = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const identifier = await hashEmail(data.email);

    const { count } = await supabaseAdmin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("identifier", identifier)
      .eq("success", false)
      .gte("created_at", windowStart());

    const failures = count ?? 0;
    return {
      allowed: failures < MAX_ATTEMPTS,
      remaining: Math.max(0, MAX_ATTEMPTS - failures),
      blockedForMinutes: WINDOW_MINUTES,
    };
  });

/** Registra o resultado da tentativa (sucesso limpa o histórico do e-mail). */
export const recordLoginAttempt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    emailSchema.extend({ success: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const identifier = await hashEmail(data.email);

    if (data.success) {
      await supabaseAdmin.from("login_attempts").delete().eq("identifier", identifier);
      return { ok: true };
    }

    await supabaseAdmin.from("login_attempts").insert({ identifier, success: false });
    return { ok: true };
  });
