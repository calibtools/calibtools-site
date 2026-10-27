import { defineCollection, z } from 'astro:content';

const guides = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    updated: z.date(),
    readingTime: z.string().optional(),
    authorName: z.string().default('Calib.Tools Engineering'),
    authorRole: z.string().default('Calibration targets & tools'),
    related: z.array(z.string()).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    keyRule: z.string().optional(),
    products: z.array(z.string()).default([]),
    sampleFiles: z.array(z.enum(['report', 'datasheet', 'csv'])).default([]),
  }),
});

const tools = defineCollection({
  type: 'content',
  schema: z.object({
    seoTitle: z.string(),
    seoDescription: z.string(),
    h1: z.string(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

const collections_ = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    sellingPoints: z.array(z.string()).length(2),
    color: z.enum(['brand', 'slate-blue', 'amber', 'grey']),
    pairsWith: z.array(z.string()).default([]),
    specsTable: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    founderQuote: z.string().optional(),
  }),
});

export const collections = { guides, tools, collections: collections_ };
