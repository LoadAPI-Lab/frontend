import type { OAuthProvider, Session } from '@/features/auth';

export const mockUser: Session = {
    id: 'usr_demo',
    name: 'Mock User',
    email: 'mock.user@example.com',
    avatarUrl: null,
};

export const mockProviders: OAuthProvider[] = [
    { id: 'google', name: 'Google' },
    { id: 'github', name: 'GitHub' },
];
