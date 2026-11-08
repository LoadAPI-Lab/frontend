import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { AccountMenu } from './account-menu';

const meta = {
    title: 'layout/AccountMenu',
    component: AccountMenu,
    args: { user: { name: 'Maxim K', email: 'maxim@example.com' }, onSignOut: fn() },
} satisfies Meta<typeof AccountMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignOut: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: /account menu for Maxim K/i }),
        );
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByText('maxim@example.com')).toBeInTheDocument();
        await userEvent.click(await body.findByRole('menuitem', { name: 'Sign out' }));
        await expect(args.onSignOut).toHaveBeenCalledOnce();
        await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
    },
};

export const WithPhoto: Story = {
    args: {
        user: {
            name: 'Maxim K',
            email: 'maxim@example.com',
            avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
        },
    },
};
