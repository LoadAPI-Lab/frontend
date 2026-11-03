import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Field } from '@/components/ui/field';

import { Textarea } from './textarea';

const meta = {
    title: 'ui/Textarea',
    component: Textarea,
    decorators: [
        (Story) => (
            <div className="w-120">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenApiPaste: Story = {
    args: { mono: true, placeholder: 'openapi: 3.0.0\ninfo:\n  title: TasksAPI', rows: 8 },
    render: (args) => (
        <Field.Root>
            <Field.Label>OpenAPI document (JSON or YAML)</Field.Label>
            <Textarea {...args} />
        </Field.Root>
    ),
    play: async ({ canvasElement }) => {
        const box = within(canvasElement).getByRole('textbox', {
            name: 'OpenAPI document (JSON or YAML)',
        });
        await userEvent.type(box, 'openapi: 3.0.0');
        await expect(box).toHaveValue('openapi: 3.0.0');
    },
};

export const Invalid: Story = {
    args: { mono: true, defaultValue: 'openapi: [', rows: 4 },
    render: (args) => (
        <Field.Root invalid>
            <Field.Label>OpenAPI document (JSON or YAML)</Field.Label>
            <Textarea {...args} />
            <Field.Error>Line 1: unexpected end of the flow sequence</Field.Error>
        </Field.Root>
    ),
};

export const Disabled: Story = {
    args: { disabled: true, defaultValue: 'Importing…' },
    render: (args) => (
        <Field.Root disabled>
            <Field.Label>Notes</Field.Label>
            <Textarea {...args} />
        </Field.Root>
    ),
};
