import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './badge';

const meta = {
    title: 'ui/Badge',
    component: Badge,
    args: { children: 'p95 64ms', variant: 'solid' },
    argTypes: {
        variant: {
            control: 'select',
            options: ['solid', 'accent-soft', 'danger', 'info', 'neutral', 'outline'],
        },
    },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = {};
export const Danger: Story = { args: { variant: 'danger', children: '5xx 3.1%' } };
export const Outline: Story = { args: { variant: 'outline', children: 'raw · JSON' } };
export const Neutral: Story = { args: { variant: 'neutral', children: 'TA' } };

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-2">
            <Badge variant="solid">p95 64ms</Badge>
            <Badge variant="accent-soft">MK</Badge>
            <Badge variant="danger">5xx 3.1%</Badge>
            <Badge variant="info">4xx 2.0%</Badge>
            <Badge variant="neutral">BA</Badge>
            <Badge variant="outline">raw · JSON</Badge>
        </div>
    ),
};
