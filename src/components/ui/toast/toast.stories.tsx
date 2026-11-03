import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '@/components/ui/button';

import { toast } from './toast-manager';
import { Toaster } from './toaster';

function ToastDemo() {
    return (
        <div className="flex gap-2">
            <Button
                onClick={() =>
                    toast.success({ title: 'Test completed', description: 'POST /api/tasks · 60s' })
                }
            >
                Success
            </Button>
            <Button
                variant="danger"
                onClick={() =>
                    toast.error({
                        title: "That didn't work",
                        description: 'Too many test runs are in progress, try again later',
                    })
                }
            >
                Error
            </Button>
            <Button
                variant="ghost"
                onClick={() => toast.info({ title: 'Test stopped' })}
            >
                Info
            </Button>
            <Toaster />
        </div>
    );
}

const meta = {
    title: 'ui/Toast',
    component: ToastDemo,
} satisfies Meta<typeof ToastDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        toast.dismiss(); // start clean: the toast manager is global
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Error' }));
        const body = within(canvasElement.ownerDocument.body);
        const message = 'Too many test runs are in progress, try again later';

        // Error toasts are high priority: Base UI announces their text through a live region
        // and keeps the toast itself (and its close button) out of the accessibility tree
        // until the user moves into the notifications region with F6.
        await expect((await body.findAllByText(message)).length).toBeGreaterThan(0);
        await userEvent.keyboard('{F6}');
        const dismiss = await body.findByRole('button', { name: 'Dismiss notification' });
        await userEvent.click(dismiss);
        await waitFor(() => expect(body.queryAllByText(message)).toHaveLength(0));
    },
};
