import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Field } from '@/components/ui/field';

import { SecretInput } from './secret-input';

const meta = {
    title: 'ui/SecretInput',
    component: SecretInput,
    args: { defaultValue: 'sk_live_51H8xQ2' },
    render: (args) => (
        <Field.Root className="w-72">
            <Field.Label>Token</Field.Label>
            <SecretInput {...args} />
        </Field.Root>
    ),
} satisfies Meta<typeof SecretInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MaskedByDefault: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText('Token');
        await expect(input).toHaveAttribute('type', 'password');
        await userEvent.click(canvas.getByRole('button', { name: 'Show' }));
        await expect(input).toHaveAttribute('type', 'text');
        await userEvent.click(canvas.getByRole('button', { name: 'Hide' }));
        await expect(input).toHaveAttribute('type', 'password');
    },
};

export const Empty: Story = { args: { defaultValue: '', placeholder: 'Paste a token' } };
