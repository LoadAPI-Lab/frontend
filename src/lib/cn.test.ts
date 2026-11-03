import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
    it('keeps custom font sizes next to text colours', () => {
        expect(cn('text-md text-fg')).toBe('text-md text-fg');
        expect(cn('text-label text-fg-muted')).toBe('text-label text-fg-muted');
        expect(cn('text-control', 'text-accent')).toBe('text-control text-accent');
    });

    it('still lets a later size override an earlier one', () => {
        expect(cn('text-md', 'text-label')).toBe('text-label');
        expect(cn('rounded-lg', 'rounded-card')).toBe('rounded-card');
    });
});
