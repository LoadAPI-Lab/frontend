import type { Meta, StoryObj } from '@storybook/react-vite';
import { PanelLeftClose } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { IconButton } from '@/components/ui/icon-button';

import { Tooltip } from './tooltip';

function CollapseButton() {
    return (
        <Tooltip.Provider delay={200}>
            <Tooltip.Root>
                <Tooltip.Trigger
                    render={
                        <IconButton aria-label="Collapse sidebar">
                            <PanelLeftClose aria-hidden />
                        </IconButton>
                    }
                />
                <Tooltip.Content>Collapse sidebar</Tooltip.Content>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
}

const meta = {
    title: 'ui/Tooltip',
    component: CollapseButton,
} satisfies Meta<typeof CollapseButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnIconButton: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.hover(
            within(canvasElement).getByRole('button', { name: 'Collapse sidebar' }),
        );
        const body = within(canvasElement.ownerDocument.body);
        // the button has no text of its own, so this finds the tooltip popup
        await expect(await body.findByText('Collapse sidebar')).toBeVisible();
    },
};
