import { defineCollection, z } from 'astro:content';

const lexikonCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        relatedTerms: z.array(z.string()).optional(),
        lastUpdated: z.date().optional(),
        faqs: z.array(z.object({
            question: z.string(),
            answer: z.string()
        })).optional(),
    }),
});

const ratgeberCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        author: z.string().default('Sozialer Navigator Redaktion'),
        image: z.string().optional(),
        tags: z.array(z.string()).optional(),
        related: z.array(z.string()).optional(),
        externalUrl: z.string().optional(),
        source: z.string().optional(),
    }),
});

export const collections = {
    'lexikon': lexikonCollection,
    'ratgeber': ratgeberCollection,
};
