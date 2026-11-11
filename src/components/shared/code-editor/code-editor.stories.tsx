import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { CodeEditor, type CodeLanguage } from './code-editor';

interface StoryArgs {
    initial: string;
    language: CodeLanguage;
    errorLine: number | null;
}

function Controlled({ initial, language, errorLine }: StoryArgs) {
    const [value, setValue] = useState(initial);
    return (
        <div className="flex w-[640px] flex-col gap-2">
            <CodeEditor
                value={value}
                onChange={setValue}
                label="Document"
                language={language}
                placeholder="openapi: 3.1.0"
                invalid={errorLine !== null}
                errorLine={errorLine}
                className="bg-surface-code border-border h-80 rounded-lg border"
            />
            <output
                data-testid="value"
                className="sr-only"
            >
                {value}
            </output>
        </div>
    );
}

const meta = {
    title: 'shared/CodeEditor',
    render: (args) => <Controlled {...args} />,
    args: { initial: '', language: 'yaml', errorLine: null },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const yamlDoc = [
    'openapi: 3.1.0',
    'info:',
    '  title: Pet Store # shown as the name',
    '  version: 1.0.0',
    'paths:',
    '  /pets:',
    '    get:',
    '      tags: [pets]',
].join('\n');

export const Empty: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const editor = canvas.getByRole('textbox', { name: 'Document' });
        await userEvent.click(editor);
        await userEvent.paste('openapi: 3.1.0');
        await waitFor(() =>
            expect(canvas.getByTestId('value')).toHaveTextContent('openapi: 3.1.0'),
        );
    },
};

export const Yaml: Story = {
    args: { initial: yamlDoc },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('textbox', { name: 'Document' }),
        ).toHaveTextContent('title: Pet Store');
    },
};

export const Json: Story = {
    args: {
        language: 'json',
        initial: JSON.stringify(
            { openapi: '3.0.3', info: { title: 'Shop API', version: '1.0.0' }, paths: {} },
            null,
            2,
        ),
    },
};

export const ErrorLine: Story = {
    args: { initial: 'openapi: 3.0.3\ninfo:\n\ttitle: Broken\npaths: {}', errorLine: 3 },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('textbox', { name: 'Document' }),
        ).toHaveAttribute('aria-invalid', 'true');
    },
};
