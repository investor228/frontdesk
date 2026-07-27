import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui";
import { appUrl } from "@/lib/utils";
import { InstallSnippet } from "./install-snippet";
import type { Bot } from "@/lib/types";

export const metadata = { title: "Install" };

export default async function InstallPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;
  const { plan } = await requireSession();
  const supabase = await createClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", botId)
    .maybeSingle<Bot>();

  if (!bot) notFound();

  const snippet = `<script src="${appUrl()}/widget.js" data-bot="${bot.public_key}" async></script>`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <Card>
        <CardHeader
          title="Add it to your website"
          description="Paste this one line just before the closing </body> tag on every page."
        />
        <div className="space-y-5 p-5">
          <InstallSnippet snippet={snippet} previewUrl={`${appUrl()}/embed/${bot.public_key}`} />

          <div className="space-y-3 border-t border-line pt-5">
            <h4 className="text-sm font-semibold text-ink">Where to paste it</h4>
            <dl className="space-y-2.5 text-sm">
              {[
                ["WordPress", "Appearance → Theme File Editor → footer.php, or any header/footer plugin."],
                ["Tilda", "Site Settings → More → HTML code inside <head>."],
                ["Wix", "Settings → Custom Code → Add code to Body – end."],
                ["Webflow", "Project Settings → Custom Code → Footer Code."],
                ["Shopify", "Online Store → Themes → Edit code → theme.liquid."],
              ].map(([platform, where]) => (
                <div key={platform} className="flex gap-3">
                  <dt className="w-24 shrink-0 font-medium text-ink">{platform}</dt>
                  <dd className="text-muted">{where}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Card>

      <aside className="space-y-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink">Good to know</h3>
          <ul className="mt-3 space-y-2.5 text-sm text-muted">
            <li>
              The widget loads in an isolated frame, so it can&apos;t inherit or
              break your site&apos;s styles.
            </li>
            <li>
              It loads asynchronously and adds a single element to the page — no
              effect on your load time.
            </li>
            <li>
              Changes you make here go live instantly. There&apos;s no need to
              re-paste the snippet.
            </li>
            {!plan.features.removeBranding && (
              <li>
                A small &ldquo;Powered by Frontdesk&rdquo; line sits under the
                chat.{" "}
                <Link href="/dashboard/billing" className="font-medium text-brand-700 hover:underline">
                  Remove it on Pro
                </Link>
                .
              </li>
            )}
          </ul>
        </Card>
      </aside>
    </div>
  );
}
