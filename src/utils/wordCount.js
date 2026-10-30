export const wordCount = value => typeof value === 'string' ? value.trim().split(/\s+/u).filter(Boolean).length : 0;
