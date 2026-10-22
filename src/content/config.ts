import { defineCollection, z } from 'astro:content';

const guides = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    readingTime: z.string().optional(),
    author: z.string().default('Calib.Tools'),
    related: z.array(z.string()).default([]),
  }),
});

export const collections = { guides };
