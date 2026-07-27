"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeDomain } from "@/lib/widget-access";

export type FormState = { error?: string; saved?: boolean };

export async function createBot(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, plan } = await requireSession();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "Give your assistant a name." };

  const supabase = await createClient();

  const { count } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) >= plan.limits.bots) {
    return {
      error: `The ${plan.name} plan includes ${plan.limits.bots} assistant${
        plan.limits.bots === 1 ? "" : "s"
      }. Upgrade to add another.`,
    };
  }

  const { data, error } = await supabase
    .from("bots")
    .insert({
      account_id: userId,
      name,
      greeting: `Hi! I'm the ${name} assistant. Ask me about our services, prices or hours.`,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create it." };

  revalidatePath("/dashboard");
  redirect(`/dashboard/bots/${data.id}`);
}

export async function updateBot(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { plan } = await requireSession();
  const botId = String(formData.get("botId") ?? "");
  if (!botId) return { error: "Missing assistant." };

  const supabase = await createClient();

  const patch: Record<string, unknown> = {
    name: String(formData.get("name") ?? "").trim(),
    greeting: String(formData.get("greeting") ?? "").trim(),
    instructions: String(formData.get("instructions") ?? "").trim(),
  };

  if (!patch.name) return { error: "The assistant needs a name." };

  // Paid-only fields are ignored rather than rejected, so a downgraded account
  // can still save the rest of the form.
  if (plan.features.customAccentColor) {
    const color = String(formData.get("accent_color") ?? "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(color)) patch.accent_color = color;
  }

  if (plan.features.leadCapture) {
    patch.lead_capture = formData.get("lead_capture") === "on";
  }

  if (plan.features.domainAllowlist) {
    patch.allowed_domains = String(formData.get("allowed_domains") ?? "")
      .split(/[\n,]/)
      .map(normalizeDomain)
      .filter(Boolean)
      .slice(0, 20);
  }

  const { error } = await supabase.from("bots").update(patch).eq("id", botId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/bots/${botId}`, "layout");
  return { saved: true };
}

export async function deleteBot(formData: FormData) {
  await requireSession();
  const botId = String(formData.get("botId") ?? "");
  if (!botId) return;

  const supabase = await createClient();
  await supabase.from("bots").delete().eq("id", botId);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
