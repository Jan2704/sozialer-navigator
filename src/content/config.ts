import { defineCollection, z } from 'astro:content';

const lexikonCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        relatedTerms: z.array(z.string()).optional(),
        lastUpdated: z.date().optional(),
    }),
});

export const collections = {
    'lexikon': lexikonCollection,
};
