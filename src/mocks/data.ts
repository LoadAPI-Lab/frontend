import type { OAuthProvider, Session } from '@/features/auth';

export const mockUser: Session = {
    id: '0b8f2a4e-6c1d-4e7a-9f3b-2d5c8a1e7f40',
    name: 'Mock User',
    email: 'mock.user@example.com',
    createdAt: '2026-11-01T09:00:00.000Z',
};

export const mockProviders: OAuthProvider[] = [
    { id: 'google', name: 'Google' },
    { id: 'github', name: 'GitHub' },
];
