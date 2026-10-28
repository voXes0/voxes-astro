import { defineCollection} from "astro:content";
import { glob } from "astro/loaders";
import { blogTopics } from "./lib/blogTopics";
import { z} from "astro/zod";

/**
 * Posts live at src/content/blog/<locale>/<slug>.mdx. A slug may exist in one
 * locale only; the other locale's pages then show that version with a notice.
 */
const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Publication date, YYYY-MM-DD. */
    date: z.coerce.date(),
    topic: z.enum(blogTopics),
    /** Proper nouns / tech names; not translated. */
    tags: z.array(z.string()).default([]),
    /** Public path of the listing thumbnail. Posts without one render text-only. */
    thumbnail: z.string().optional(),
  }),
});

export const collections = { blog };
