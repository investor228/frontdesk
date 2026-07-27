"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "../actions";
import { Alert, Button, Card, Field, Input, Spinner } from "@/components/ui";

const INITIAL: AuthState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, INITIAL);

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

        <Button type="submit" disabled={pending} className="w-full" size="lg">
          {pending && <Spinner />}
          Sign in
        </Button>
      </form>
    </Card>
  );
}
