import type { Meta, StoryObj } from '@storybook/react-vite';
import { History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { UploadIcon } from '@/components/ui/icons';

import { EmptyState } from './empty-state';

const meta = {
    title: 'shared/EmptyState',
    component: EmptyState,
    args: {
        icon: <History />,
        title: 'No runs yet',
        description: 'Start a test from a route in your collections and it shows up here.',
        action: <Button variant="primary">Go to stress tests</Button>,
    },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CompactInSidebar: Story = {
    args: {
        size: 'compact',
        icon: <UploadIcon />,
        title: 'No collections yet',
        description: 'Import an OpenAPI doc to see its endpoints here.',
        action: undefined,
    },
    decorators: [
        (Story) => (
            <div className="border-divider w-64 border">
                <Story />
            </div>
        ),
    ],
};
