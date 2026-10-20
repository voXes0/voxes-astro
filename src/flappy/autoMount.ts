import { mountOnNavigate } from "@/lib/autoMount";

// Mounts every <FlappyBird> on the page. The game code is imported lazily, so
// pages without a game never download it.
mountOnNavigate(async (isStale) => {
  const roots = Array.from(document.querySelectorAll<HTMLElement>("[data-flappy]"));
  if (roots.length === 0) return;

  const { mountFlappy } = await import("./game");
  if (isStale()) return;
  const destroyers = roots.filter((r) => r.isConnected).map((r) => mountFlappy(r));
  return () => destroyers.forEach((d) => d());
});
