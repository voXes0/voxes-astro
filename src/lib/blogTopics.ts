export const blogTopics = ["algorithm", "framework", "comparison", "notes"] as const;

export type BlogTopic = (typeof blogTopics)[number];
