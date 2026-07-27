import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { supabaseConfigured } from "./supabase/config";
import { planOf, type Plan } from "./plans";
import type { Account } from "./types";

export type Session = {
  userId: string;
  account: Account;
  plan: Plan;
};

/** Load the signed-in user's account, or null when signed out. */
export async function getSession(): Promise<Session | null> {
  if (!supabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", user.id)
    .single<Account>();

  if (!account) return null;

  return { userId: user.id, account, plan: planOf(account.plan) };
}

/** Server Component / Server Action guard. Redirects signed-out visitors. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
