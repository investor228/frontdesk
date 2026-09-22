"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * `redirectTo` is set on success and the form does a full page load there.
 * A `redirect()` from these actions made Next stream /dashboard back inside
 * the action response, and applying that payload crashed the client with
 * "This page couldn't load" — while a plain load of /dashboard renders fine.
 */
export type AuthState = { error?: string; notice?: string; redirectTo?: string };

/** Same-origin paths only: "//host" and "/\host" would leave the site. */
function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/dashboard";
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  return { redirectTo: safeNext(next) };
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("company") ?? "").trim();

  if (!email || !password) return { error: "Enter your email and password." };
  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };

  // Supabase projects with email confirmation on return a user but no session.
  if (!data.session) {
    return {
      notice: "Check your inbox — we sent you a link to confirm your email.",
    };
  }

  if (companyName) {
    // The signup trigger has already created the account row.
    await supabase
      .from("accounts")
      .update({ company_name: companyName })
      .eq("id", data.user!.id);
  }

  return { redirectTo: "/dashboard" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
