import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Tooltip } from '@/components/ui/tooltip';

import { Sidebar } from './sidebar';

function DemoSidebar({ startCollapsed = false }: { startCollapsed?: boolean }) {
    const [collapsed, setCollapsed] = useState(startCollapsed);
    return (
        <Tooltip.Provider>
            <div className="flex h-120">
                <Sidebar
                    title="Collections"
                    collapsed={collapsed}
                    onCollapsedChange={setCollapsed}
                    footer={<div className="text-fg-muted text-center text-base">footer slot</div>}
                >
                    <p className="text-fg-muted px-2 text-base">content slot</p>
                </Sidebar>
            </div>
        </Tooltip.Provider>
    );
}

const meta = {
    title: 'layout/Sidebar',
    component: DemoSidebar,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DemoSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Collapse sidebar' }));
        const expand = canvas.getByRole('button', { name: 'Expand sidebar' });
        await expect(expand).toHaveAttribute('aria-expanded', 'false');
        await expect(canvas.queryByText('content slot')).not.toBeInTheDocument();
    },
};

export const Collapsed: Story = { args: { startCollapsed: true } };
