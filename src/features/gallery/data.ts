import { t, type Locale } from "@/i18n";

export interface Slide {
  src: string;
  alt: string;
}

export type GalleryLabels = ReturnType<typeof t>["gallery"];

/** What a gallery host carries in `data-gallery` for src/features/gallery to pick up. */
export interface GalleryData {
  slides: Slide[];
  labels: GalleryLabels;
  /** Milliseconds between automatic slides; omitted for a manual slider. */
  autoplay?: number;
}

/** One image or several. `alt` is shared by all of them, or one per image. */
export function toSlides(src: string | string[], alt: string | string[]): Slide[] {
  return [src].flat().map((s, i) => ({ src: s, alt: typeof alt === "string" ? alt : (alt[i] ?? "") }));
}

/** The `data-gallery` attribute value for a figure's images. */
export function galleryData(locale: Locale, slides: Slide[], autoplay?: number): string {
  const data: GalleryData = { slides, labels: t(locale).gallery, autoplay };
  return JSON.stringify(data);
}
