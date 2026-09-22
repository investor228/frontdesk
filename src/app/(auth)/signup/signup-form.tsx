"use client";

import { useActionState, useEffect } from "react";
import { signUp, type AuthState } from "../actions";
import { Alert, Button, Card, Field, Input, Spinner } from "@/components/ui";

const INITIAL: AuthState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, INITIAL);
  const busy = pending || Boolean(state.redirectTo);

  // Full page load, not a client transition — see AuthState in ../actions.
  useEffect(() => {
    if (state.redirectTo) window.location.replace(state.redirectTo);
  }, [state.redirectTo]);

  if (state.notice) {
    return (
      <Card className="p-5">
        <Alert tone="success">{state.notice}</Alert>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <Field label="Business name" htmlFor="company" hint="Shown at the top of your chat widget.">
          <Input
            id="company"
            name="company"
            required
            placeholder="Tatiana Beauty Studio"
          />
        </Field>

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

        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••"
          />
        </Field>

        {state.error && <Alert tone="danger">{state.error}</Alert>}

        <Button type="submit" disabled={busy} className="w-full" size="lg">
          {busy && <Spinner />}
          Create account
        </Button>
      </form>
    </Card>
  );
}
