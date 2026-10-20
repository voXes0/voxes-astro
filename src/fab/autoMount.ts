import { mountOnNavigate } from "@/lib/autoMount";

// The heavy modules are imported lazily, so pages without a fabricator never download them.
mountOnNavigate(async (isStale) => {
  const stage = document.querySelector<SVGSVGElement>("#fab-stage");
  if (!stage) return;

  const [{ mountFabricator }, { mountChapters }, { chapters, pieces }] = await Promise.all([
    import("./sequencer"),
    import("./director"),
    import("./pieces"),
  ]);
  if (isStale() || !stage.isConnected) return;
  return chapters.length > 0 ? mountChapters(stage, chapters) : mountFabricator(stage, pieces);
});
