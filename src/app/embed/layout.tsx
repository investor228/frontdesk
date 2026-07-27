/**
 * The embed tree renders inside a third-party iframe. It deliberately paints no
 * background — the loader sizes the frame to the launcher when closed, and any
 * background here would show as an opaque square on the host page.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-dvh overflow-hidden bg-transparent">{children}</div>;
}
