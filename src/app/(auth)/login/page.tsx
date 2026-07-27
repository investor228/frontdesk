import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">
        Sign in to manage your assistants.
      </p>

      <div className="mt-6">
        <LoginForm next={next ?? "/dashboard"} />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-brand-700 hover:underline">
          Create one free
        </Link>
      </p>
    </div>
  );
}
