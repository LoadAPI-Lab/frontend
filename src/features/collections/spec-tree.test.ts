import { describe, expect, it } from 'vitest';

import { shopSpec } from '@/mocks/api-specs';

import type { Endpoint } from './api';
import {
    endpointMatches,
    groupEndpoints,
    matchRanges,
    searchTerms,
    specInitials,
    splitDisplayPath,
} from './spec-tree';

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

describe('splitDisplayPath', () => {
    it('keeps the last segment whole so the cut falls in the middle', () => {
        expect(splitDisplayPath('/v1/test-runs/{id}/rerun')).toEqual({
            head: '/v1/test-runs/{id}',
            tail: '/rerun',
        });
    });

    it('keeps the segment before a trailing path parameter in longer paths', () => {
        expect(splitDisplayPath('/products/{productId}')).toEqual({
            head: '/products',
            tail: '/{productId}',
        });
        expect(splitDisplayPath('/v1/users/{id}')).toEqual({ head: '/v1', tail: '/users/{id}' });
        expect(splitDisplayPath('/v1/users/:id')).toEqual({ head: '/v1', tail: '/users/:id' });
        expect(splitDisplayPath('/v1/users/')).toEqual({ head: '/v1', tail: '/users/' });
    });

    it('leaves short paths in the tail', () => {
        expect(splitDisplayPath('/health')).toEqual({ head: '', tail: '/health' });
        expect(splitDisplayPath('/')).toEqual({ head: '', tail: '/' });
    });
});

describe('endpoint search', () => {
    const endpoint: Endpoint = {
        id: 'get-product',
        key: 'GET /products/{productId}',
        method: 'GET',
        path: '/products/{productId}',
        summary: 'Fetch one product',
        tags: ['products'],
        parameters: [],
        responses: [],
    };

    it('splits the query into lower-case terms', () => {
        expect(searchTerms('  GET   Products ')).toEqual(['get', 'products']);
        expect(searchTerms('   ')).toEqual([]);
    });

    it('matches every term against method, path and summary', () => {
        expect(endpointMatches(endpoint, searchTerms('get products'))).toBe(true);
        expect(endpointMatches(endpoint, searchTerms('fetch'))).toBe(true);
        expect(endpointMatches(endpoint, searchTerms('post products'))).toBe(false);
    });

    it('finds and merges match ranges', () => {
        expect(matchRanges('/v1/runs/run', ['run'])).toEqual([
            [4, 7],
            [9, 12],
        ]);
        expect(matchRanges('/products', ['prod', 'rodu'])).toEqual([[1, 6]]);
        expect(matchRanges('/health', ['x'])).toEqual([]);
    });
});
