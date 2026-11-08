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
    /** Hidden guides are noindexed and excluded from listings. */
    draft: z.boolean().default(false),
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
    seoTitle: z.string().min(25).max(60).optional(),
    seoDescription: z.string().min(120).max(160).optional(),
    sellingPoints: z.array(z.string()).length(2),
    color: z.enum(['brand', 'slate-blue', 'amber', 'gray']),
    pairsWith: z.array(z.string()).default([]),
    specsTable: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    brandNote: z.string().optional(),
  }),
});

const products = defineCollection({
  type: 'content',
  schema: z.object({
    summary: z.string().max(90),
    seoTitle: z.string().min(25).max(60).optional(),
    seoDescription: z.string().min(120).max(160).optional(),
    decideSpecs: z.tuple([z.string(), z.string(), z.string()]),
    /** Short value-only chip strings for card display (e.g. "±0.3 mm", "6 mm"). */
    chips: z.tuple([z.string(), z.string(), z.string()]).optional(),
    story: z.string().optional(),
    inTheBox: z.array(z.string()).optional(),
    compat: z.array(z.object({ tool: z.string(), note: z.string() })).optional(),
    /** One-line description per part number, shown in the ordering table (long-form pages). */
    skus: z.array(z.object({ partNumber: z.string(), title: z.string().max(90) })).default([]),
    /** Right-column lists on long-form pages (desktop aside, after the article on mobile). */
    relatedTargets: z.array(z.object({ label: z.string(), href: z.string(), note: z.string().max(80) })).default([]),
    relatedGuides: z.array(z.object({ label: z.string(), href: z.string(), note: z.string().max(80) })).default([]),
  }),
});


const applications = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().min(25).max(45),
    seoDescription: z.string().min(120).max(160),
    code: z.string(),
    order: z.number(),
    audience: z.string(),
    summary: z.string().max(220),
    products: z.array(z.string()).min(2),
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    selection: z.array(z.object({ scenario: z.string(), pattern: z.string(), size: z.string(), material: z.string() })).min(3),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).min(3),
  }),
});

export const collections = {
  applications, guides, tools, collections: collections_, products };
