"use client";

import { useActionState, useEffect } from "react";
import { signIn, type AuthState } from "../actions";
import { Alert, Button, Card, Field, Input, Spinner } from "@/components/ui";

const INITIAL: AuthState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, INITIAL);
  const busy = pending || Boolean(state.redirectTo);

  // Full page load, not a client transition — see AuthState in ../actions.
  useEffect(() => {
    if (state.redirectTo) window.location.replace(state.redirectTo);
  }, [state.redirectTo]);

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@yourbusiness.com"
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </Field>

        {state.error && <Alert tone="danger">{state.error}</Alert>}

        <Button type="submit" disabled={busy} className="w-full" size="lg">
          {busy && <Spinner />}
          Sign in
        </Button>
      </form>
    </Card>
  );
}
