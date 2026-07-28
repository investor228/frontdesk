import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * The app's public origin, without a trailing slash.
 *
 * Every caller appends a path to this, so a trailing slash — which is the
 * natural thing to paste out of a browser address bar — produced URLs like
 * `https://example.com//embed/fd_x`. That matches no route, and the widget
 * snippet handed to customers was silently broken.
 */
export function appUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return configured.trim().replace(/\/+$/, "");
}
