import type { Decorator } from '@storybook/react-vite';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';

/**
 * Wraps a story in a memory router so <Link> works. Pick the current URL with
 * `parameters: { route: '/history' }` (default `/tests`).
 */
export const withRouter: Decorator = (Story, context) => {
    const { route } = context.parameters;
    const initial = typeof route === 'string' ? route : '/tests';
    return <StoryRouter initial={initial}>{() => <Story />}</StoryRouter>;
};

function StoryRouter({ initial, children }: { initial: string; children: () => ReactNode }) {
    const [router] = useState(() =>
        createRouter({
            routeTree: createRootRoute({ component: children }),
            history: createMemoryHistory({ initialEntries: [initial] }),
        }),
    );
    return <RouterProvider router={router} />;
}
