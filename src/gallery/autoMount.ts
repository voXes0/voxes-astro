import { mountOnNavigate } from "@/lib/autoMount";

// Pages without a figure never download the slider code.
mountOnNavigate(async (isStale) => {
  const hosts = Array.from(document.querySelectorAll<HTMLElement>("[data-gallery]"));
  if (hosts.length === 0) return;

  const { mountGalleries } = await import("./inline");
  if (isStale()) return;
  return mountGalleries(hosts.filter((h) => h.isConnected));
});
