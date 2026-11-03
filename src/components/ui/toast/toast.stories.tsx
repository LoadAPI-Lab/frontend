import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

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
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Error' }));
        const body = within(canvasElement.ownerDocument.body);
        await expect(
            await body.findByText('Too many test runs are in progress, try again later'),
        ).toBeInTheDocument();
        await userEvent.click(await body.findByRole('button', { name: 'Dismiss notification' }));
    },
};
