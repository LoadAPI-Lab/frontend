import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { withRouter } from '../../../.storybook/with-router';
import { AccountMenu } from './account-menu';
import { TopBar } from './top-bar';

const meta = {
    title: 'layout/TopBar',
    component: TopBar,
    decorators: [withRouter],
    parameters: { layout: 'fullscreen' },
    args: {
        actions: (
            <AccountMenu
                user={{ name: 'Maxim K', email: 'maxim@example.com' }}
                onSignOut={() => {}}
            />
        ),
    },
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnStressTests: Story = {
    play: async ({ canvasElement }) => {
        const nav = within(canvasElement).getByRole('navigation', { name: 'Main' });
        await expect(within(nav).getByRole('link', { name: 'Stress tests' })).toHaveAttribute(
            'aria-current',
            'page',
        );
    },
};

export const OnHistory: Story = { parameters: { route: '/history' } };
