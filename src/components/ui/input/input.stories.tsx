import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Field } from '@/components/ui/field';

import { Input } from './input';

const meta = {
    title: 'ui/Input',
    component: Input,
    args: { placeholder: 'https://staging.tasks.dev' },
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: (args) => (
        <Field.Root>
            <Field.Label>Base URL</Field.Label>
            <Input {...args} />
            <Field.Description>Requests go to this host.</Field.Description>
        </Field.Root>
    ),
    play: async ({ canvasElement }) => {
        const input = within(canvasElement).getByRole('textbox', { name: 'Base URL' });
        await userEvent.type(input, 'https://api.example.com');
        await expect(input).toHaveValue('https://api.example.com');
    },
};

export const Invalid: Story = {
    render: (args) => (
        <Field.Root invalid>
            <Field.Label>Base URL</Field.Label>
            <Input
                {...args}
                defaultValue="ftp://nope"
            />
            <Field.Error>URL must start with http:// or https://</Field.Error>
        </Field.Root>
    ),
};

export const Disabled: Story = {
    render: (args) => (
        <Field.Root disabled>
            <Field.Label>Base URL</Field.Label>
            <Input
                {...args}
                defaultValue="https://staging.tasks.dev"
            />
        </Field.Root>
    ),
};

export const LongValue: Story = {
    render: (args) => (
        <Field.Root>
            <Field.Label>Base URL</Field.Label>
            <Input
                {...args}
                defaultValue="https://a-very-long-subdomain.staging.internal.tasks.example.dev/api/v1/tasks?include=everything"
            />
        </Field.Root>
    ),
};
