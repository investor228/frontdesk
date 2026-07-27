"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createBot, type FormState } from "./actions";
import { Alert, Button, Input, Spinner } from "@/components/ui";

const INITIAL: FormState = {};

export function NewBotForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction, pending] = useActionState(createBot, INITIAL);
  const [open, setOpen] = useState(!compact);

  if (compact && !open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New assistant
      </Button>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-sm space-y-3">
      <div className="flex gap-2">
        <Input
          name="name"
          required
          autoFocus={compact}
          placeholder="Tatiana Beauty Studio"
          aria-label="Assistant name"
        />
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : <Plus className="size-4" />}
          Create
        </Button>
      </div>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
    </form>
  );
}
