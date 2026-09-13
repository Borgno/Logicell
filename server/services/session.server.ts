import crypto from "node:crypto";

const sessionSecret: string = process.env.SESSION_SECRET || "";
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

export const SESSION_COOKIE_NAME = "__logicell_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

// Sessão própria (sem Supabase por request): os dados do usuário ficam no
// próprio cookie, assinado por HMAC. `exp` em segundos Unix, 30 dias a partir
// do login — sem refresh remoto, ver auth.server.ts.
export interface SessionData {
  sub?: string;
  email?: string;
  role?: string;
  nome?: string;
  exp?: number;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function parse(cookieHeader: string | null | undefined): SessionData {
  if (!cookieHeader) return {};
  const match = cookieHeader.split(";").find((c) => {
    const idx = c.indexOf("=");
    return idx > 0 && c.slice(0, idx).trim() === SESSION_COOKIE_NAME;
  });
  if (!match) return {};
  const raw = match.slice(match.indexOf("=") + 1).trim();
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return {};
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return {};
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data === "object" && data ? data : {};
  } catch {
    return {};
  }
}

function serialize(value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export const sessionStorage = {
  getSession(cookieHeader?: string | null): SessionData {
    return parse(cookieHeader);
  },

  commitSession(data: SessionData): string {
    const payload = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
    const value = `${payload}.${sign(payload)}`;
    return serialize(value, COOKIE_MAX_AGE);
  },

  destroySession(): string {
    return serialize("", 0);
  },
};

export const getSession = sessionStorage.getSession;
