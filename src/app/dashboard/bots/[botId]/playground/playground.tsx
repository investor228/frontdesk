"use client";

import { useRouter } from "next/navigation";
import { Chat } from "@/components/chat";

const SUGGESTIONS = [
  "What are your opening hours?",
  "How much does it cost?",
  "Do I need to book ahead?",
];

export function Playground({
  botId,
  greeting,
  accentColor,
}: {
  botId: string;
  greeting: string;
  accentColor: string;
}) {
  const router = useRouter();

  return (
    <Chat
      className="h-[560px]"
      endpoint="/api/chat"
      payload={{ botId }}
      greeting={greeting}
      accentColor={accentColor}
      suggestions={SUGGESTIONS}
      // Quota is spent here too, so refresh the header meter when it runs out.
      onUpgradeNeeded={() => router.refresh()}
    />
  );
}
