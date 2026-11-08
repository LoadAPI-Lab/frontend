import { describe, expect, it } from 'vitest';

import { shopSpec } from '@/mocks/api-specs';

import { groupEndpoints, specInitials } from './spec-tree';

describe('groupEndpoints', () => {
    it('puts endpoints in folders by their first tag, in spec order', () => {
        const { folders, untagged } = groupEndpoints(shopSpec.endpoints);
        expect(folders.map((folder) => [folder.tag, folder.endpoints.length])).toEqual([
            ['products', 3],
            ['orders', 1],
        ]);
        expect(untagged.map((endpoint) => endpoint.key)).toEqual(['GET /health']);
    });
});

describe('specInitials', () => {
    it('matches the Figma badges', () => {
        expect(specInitials('TasksAPI')).toBe('TA');
        expect(specInitials('BillingAPI')).toBe('BA');
        expect(specInitials('Notifications')).toBe('NT');
        expect(specInitials('Shop API')).toBe('SA');
        expect(specInitials('LoadAPI test server')).toBe('LA');
    });
});
