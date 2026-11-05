import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '@/components/ui/button';

import { Dialog } from './dialog';

function Example() {
    return (
        <Dialog.Root>
            <Dialog.Trigger render={<Button>Open dialog</Button>} />
            <Dialog.Popup>
                <Dialog.Title>Delete collection</Dialog.Title>
                <Dialog.Description>
                    Its endpoints disappear from the sidebar. Past runs stay in History.
                </Dialog.Description>
                <Dialog.Footer>
                    <Dialog.Close render={<Button variant="ghost">Cancel</Button>} />
                    <Dialog.Close render={<Button variant="danger">Delete</Button>} />
                </Dialog.Footer>
            </Dialog.Popup>
        </Dialog.Root>
    );
}

const meta = {
    title: 'ui/Dialog',
    component: Example,
} satisfies Meta<typeof Example>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenAndClose: Story = {
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open dialog' }));
        const dialog = await body.findByRole('dialog', { name: 'Delete collection' });
        await waitFor(() => expect(dialog).toBeVisible());
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    },
};
