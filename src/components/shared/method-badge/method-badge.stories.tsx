import type { Meta, StoryObj } from '@storybook/react-vite';

import { HTTP_METHODS } from '@/lib/http-method';

import { MethodBadge } from './method-badge';

const meta = {
    title: 'shared/MethodBadge',
    component: MethodBadge,
    args: { method: 'POST' },
} satisfies Meta<typeof MethodBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { size: 'lg' } };

export const AllMethods: Story = {
    render: () => (
        <div className="flex gap-2">
            {HTTP_METHODS.map((method) => (
                <MethodBadge
                    key={method}
                    method={method}
                    size="md"
                />
            ))}
        </div>
    ),
};
