import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button } from './button';

const meta = {
    title: 'ui/Button',
    component: Button,
    args: { children: 'Stop test', onClick: fn() },
    argTypes: {
        variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
        size: { control: 'select', options: ['sm', 'md', 'icon'] },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Secondary: Story = {};
export const Primary: Story = { args: { variant: 'primary', children: 'Run test' } };
export const Danger: Story = { args: { variant: 'danger' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'Cancel' } };
export const Disabled: Story = { args: { disabled: true } };

export const ClickCallsHandler: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Stop test' }));
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};
