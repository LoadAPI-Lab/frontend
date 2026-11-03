import type { Meta, StoryObj } from '@storybook/react-vite';
import { PanelLeftClose, Plus } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { IconButton } from './icon-button';

const meta = {
    title: 'ui/IconButton',
    component: IconButton,
    args: { 'aria-label': 'New collection', onClick: fn(), children: <Plus aria-hidden /> },
    argTypes: {
        variant: { control: 'select', options: ['secondary', 'ghost'] },
        size: { control: 'select', options: ['sm', 'md'] },
    },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Secondary: Story = {
    play: async ({ args, canvasElement }) => {
        const button = within(canvasElement).getByRole('button', { name: 'New collection' });
        button.focus();
        await userEvent.keyboard('{Enter}');
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Medium: Story = {
    args: {
        size: 'md',
        'aria-label': 'Collapse sidebar',
        children: <PanelLeftClose aria-hidden />,
    },
};
export const Disabled: Story = { args: { disabled: true } };
