export const CATEGORIES = ['Hamd', 'Naat', 'Sufi', 'General'] as const;

export type CategoryType = typeof CATEGORIES[number];
