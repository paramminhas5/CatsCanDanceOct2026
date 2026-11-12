/**
 * Signing in, the same way in every app (Param, 10 Nov 2026: "we need username password and remember me,
 * people don't wanna keep signing in"). Email and password is the everyday path. A 6-digit emailed code
 * checks a new account once and covers a forgotten password. "Remember me" off ends the session when the
 * browser closes: a session cookie marks the browser session, and a flag says the sign-in should not outlive it.
 *
 * Framework-free: pass any supabase-js client.
 */
type Err = { message: string } | null;
type AuthLike = {
  auth: {
    signInWithPassword(o: { email: string; password: string }): Promise<{ error: Err }>;
    signUp(o: { email: string; password: string; options?: { emailRedirectTo?: string } }): Promise<{ data: { user: { identities?: unknown[] | null } | null; session: unknown }; error: Err }>;
    signInWithOtp(o: { email: string; options?: { emailRedirectTo?: string; shouldCreateUser?: boolean } }): Promise<{ error: Err }>;
    verifyOtp(o: { email: string; token: string; type: "email" | "signup" | "magiclink" }): Promise<{ error: Err }>;
    updateUser(o: { password: string }): Promise<{ error: Err }>;
    signOut(): Promise<unknown>;
  };
};
export type AuthResult = { ok: true } | { ok: false; error: string };

const clean = (e: string) => e.trim().toLowerCase();
const ONLY = "ccd_session_only";
const ALIVE = "ccd_alive";

function cookieDomain() {
  if (typeof window === "undefined") return "";
  return /(^|\.)catscandance\.com$/.test(window.location.hostname) ? "; domain=.catscandance.com" : "";
}

/** Call after any successful sign-in. */
export function rememberChoice(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (remember) localStorage.removeItem(ONLY);
    else localStorage.setItem(ONLY, "1");
    document.cookie = `${ALIVE}=1; path=/; samesite=lax${cookieDomain()}`;
  } catch { /* storage blocked: the session simply persists */ }
}

/** On load: true when the person chose not to be remembered and the browser has since been closed. */
export function sessionShouldEnd(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (!localStorage.getItem(ONLY)) return false;
    return !document.cookie.split(/;\s*/).some((c) => c.startsWith(`${ALIVE}=`));
  } catch { return false; }
}
export function forgetChoice() { try { localStorage.removeItem(ONLY); } catch { /* nothing */ } }

export async function signInPassword(sb: AuthLike, email: string, password: string, remember: boolean): Promise<AuthResult> {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return { ok: false, error: "Check the email." };
  if (!password) return { ok: false, error: "Type your password." };
  const { error } = await sb.auth.signInWithPassword({ email: clean(email), password });
  if (error) {
    if (/confirm/i.test(error.message)) return { ok: false, error: "Check your email for the code to finish making your account." };
    return { ok: false, error: "That email and password don't match. First time with a password? Tap Forgot it and set one." };
  }
  rememberChoice(remember);
  return { ok: true };
}

/** Make an account with a password. Returns "code" when Supabase wants the email checked first. */
export async function signUpPassword(sb: AuthLike, email: string, password: string, redirect: string): Promise<AuthResult & { next?: "code" | "in" }> {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return { ok: false, error: "Check the email." };
  if (password.length < 8) return { ok: false, error: "Use 8 characters or more." };
  const { data, error } = await sb.auth.signUp({ email: clean(email), password, options: { emailRedirectTo: redirect } });
  if (error) return { ok: false, error: /registered|exists/i.test(error.message) ? "You already have an account. Sign in, or tap Forgot it to set a password." : "Could not make the account. Try again in a minute." };
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, error: "You already have an account. Sign in, or tap Forgot it to set a password." };
  return { ok: true, next: data.session ? "in" : "code" };
}

export async function sendCode(sb: AuthLike, email: string, redirect: string): Promise<AuthResult> {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return { ok: false, error: "Check the email." };
  const { error } = await sb.auth.signInWithOtp({ email: clean(email), options: { emailRedirectTo: redirect } });
  return error ? { ok: false, error: "Could not send the code. Try again in a minute." } : { ok: true };
}

export async function verifyCode(sb: AuthLike, email: string, code: string, remember = true): Promise<AuthResult> {
  const token = code.replace(/\D/g, "");
  if (token.length < 6) return { ok: false, error: "The code is 6 digits." };
  let { error } = await sb.auth.verifyOtp({ email: clean(email), token, type: "email" });
  if (error) ({ error } = await sb.auth.verifyOtp({ email: clean(email), token, type: "signup" }));
  if (error) return { ok: false, error: /expired/i.test(error.message) ? "That code has expired. Send a new one." : "That code did not work. Check it and try again." };
  rememberChoice(remember);
  return { ok: true };
}

export async function setPassword(sb: AuthLike, password: string): Promise<AuthResult> {
  if (password.length < 8) return { ok: false, error: "Use 8 characters or more." };
  const { error } = await sb.auth.updateUser({ password });
  return error ? { ok: false, error: /different|same/i.test(error.message) ? "That is your current password. Pick a new one." : "Could not save the password. Try again." } : { ok: true };
}
