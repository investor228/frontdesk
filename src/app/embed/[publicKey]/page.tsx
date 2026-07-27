import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { planOf } from "@/lib/plans";
import { isAllowedOrigin } from "@/lib/widget-access";
import { WidgetShell } from "@/components/widget-shell";
import { appUrl } from "@/lib/utils";
import type { Bot } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Starter questions — the three a local business gets asked most. */
const SUGGESTIONS = [
  "What are your opening hours?",
  "How much does it cost?",
  "Where are you located?",
];

export const metadata = {
  title: "Chat",
  robots: { index: false, follow: false },
};

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ publicKey: string }>;
}) {
  const { publicKey } = await params;

  // A deployment without Supabase keys has no bots to serve.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return <Silent reason="not configured" />;

  const admin = createAdminClient();

  const { data: bot } = await admin
    .from("bots")
    .select("*")
    .eq("public_key", publicKey)
    .maybeSingle<Bot>();

  // A mistyped or revoked key must not paint a cropped 404 in the corner of a
  // customer's website. Render nothing, and leave the explanation somewhere
  // only whoever installed the snippet will look.
  if (!bot) return <Silent reason="unknown assistant key" />;

  const { data: account } = await admin
    .from("accounts")
    .select("plan")
    .eq("id", bot.account_id)
    .single<{ plan: string }>();

  const plan = planOf(account?.plan);

  // The iframe's own request carries the host page as Referer, which is the
  // only signal available here for the owner's domain allowlist.
  const referer = (await headers()).get("referer");
  if (!isAllowedOrigin(bot, referer)) {
    return <Blocked />;
  }

  return (
    <WidgetShell
      publicKey={bot.public_key}
      name={bot.name}
      greeting={bot.greeting}
      accentColor={plan.features.customAccentColor ? bot.accent_color : "#0f766e"}
      suggestions={SUGGESTIONS}
      leadCapture={plan.features.leadCapture && bot.lead_capture}
      showBranding={!plan.features.removeBranding}
      appUrl={appUrl()}
    />
  );
}

/**
 * Renders nothing visible. The widget frame stays transparent on the host page,
 * so a broken install degrades to "no widget" rather than to a white box —
 * while the reason is still one DevTools glance away for the installer.
 */
function Silent({ reason }: { reason: string }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `console.warn(${JSON.stringify(`[Frontdesk] Widget not loaded: ${reason}. Check the data-bot key in your embed snippet.`)})`,
      }}
    />
  );
}

function Blocked() {
  return (
    <div className="flex h-dvh items-end justify-end p-4">
      <div className="max-w-[280px] rounded-xl border border-line bg-raised p-3 text-xs text-muted shadow-lg">
        This Frontdesk assistant isn&apos;t enabled for this domain. Add it under
        Settings → Allowed domains.
      </div>
    </div>
  );
}
