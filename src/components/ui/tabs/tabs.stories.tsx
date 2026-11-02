import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Tabs } from './tabs';

const meta = {
    title: 'ui/Tabs',
    component: Tabs.Root,
    render: () => (
        <Tabs.Root defaultValue="body">
            <Tabs.List aria-label="Request">
                <Tabs.Tab value="body">Body</Tabs.Tab>
                <Tabs.Tab value="headers">Headers</Tabs.Tab>
                <Tabs.Tab value="auth">Auth</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel
                value="body"
                className="pt-3 text-sm"
            >
                Body panel
            </Tabs.Panel>
            <Tabs.Panel
                value="headers"
                className="pt-3 text-sm"
            >
                Headers panel
            </Tabs.Panel>
            <Tabs.Panel
                value="auth"
                className="pt-3 text-sm"
            >
                Auth panel
            </Tabs.Panel>
        </Tabs.Root>
    ),
} satisfies Meta<typeof Tabs.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SwitchesPanels: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('tab', { name: 'Headers' }));
        await expect(canvas.getByRole('tab', { name: 'Headers' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        await expect(canvas.getByText('Headers panel')).toBeVisible();
    },
};
