/**
 * Names for the CSS-only scroll-spy behind SectionToc: each section is a named
 * view timeline (`view-timeline-name`), its contents link animates against it,
 * and a common ancestor declares them all with `timeline-scope`.
 */
export const spyName = (id: string) => `--spy-${id}`;

export const spyScope = (ids: string[]) => ids.map(spyName).join(", ");
