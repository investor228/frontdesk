"use client";

import { useState } from "react";
import { deleteBot } from "@/app/dashboard/actions";
import { Button, Card, CardHeader, Input } from "@/components/ui";

/**
 * Deleting a bot removes its documents, chunks and conversation history. The
 * name must be typed to confirm — this is not undoable.
 */
export function DangerZone({
  botId,
  botName,
}: {
  botId: string;
  botName: string;
}) {
  const [confirmation, setConfirmation] = useState("");
  const matches = confirmation.trim() === botName;

  return (
    <Card className="border-danger/20">
      <CardHeader
        title="Delete this assistant"
        description="Its documents, chat history and leads are deleted with it. This can't be undone."
      />
      <form action={deleteBot} className="flex flex-wrap items-end gap-3 p-5">
        <input type="hidden" name="botId" value={botId} />
        <div className="min-w-[240px] flex-1 space-y-1.5">
          <label htmlFor="confirm" className="block text-sm text-muted">
            Type <span className="font-medium text-ink">{botName}</span> to confirm
          </label>
          <Input
            id="confirm"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={botName}
          />
        </div>
        <Button type="submit" variant="danger" disabled={!matches}>
          Delete permanently
        </Button>
      </form>
    </Card>
  );
}
