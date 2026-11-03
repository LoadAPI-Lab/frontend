import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Chip } from './chip';

const meta = {
    title: 'ui/Chip',
    component: Chip,
    args: { children: '{{$uuid}}', onClick: fn() },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: '{{$uuid}}' }));
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};

export const PlaceholderRow: Story = {
    render: () => (
        <div className="flex flex-wrap gap-1.5">
            {['{{$uuid}}', '{{$randomEmail}}', '{{$randomInt}}', '{{$timestamp}}'].map((token) => (
                <Chip key={token}>{token}</Chip>
            ))}
        </div>
    ),
};

export const Disabled: Story = { args: { disabled: true } };
