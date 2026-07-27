"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button, Spinner } from "@/components/ui";

/** Sends the customer to Stripe's hosted portal to change or cancel a plan. */
export function ManageSubscription() {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (body.url) {
        window.location.href = body.url;
        return;
      }
      throw new Error(body.error ?? "Could not open the billing portal.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={open} disabled={loading}>
      {loading ? <Spinner className="size-3.5" /> : <ExternalLink className="size-3.5" />}
      Manage subscription
    </Button>
  );
}
