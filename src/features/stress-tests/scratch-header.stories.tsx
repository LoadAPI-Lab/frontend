import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { HttpMethod } from '@/lib/http-method';

import { ScratchHeader, type ScratchHeaderProps } from './scratch-header';

function Controlled({
    initialMethod = 'GET',
    initialUrl = '',
    ...props
}: Omit<ScratchHeaderProps, 'method' | 'onMethodChange' | 'url' | 'onUrlChange'> & {
    initialMethod?: HttpMethod;
    initialUrl?: string;
}) {
    const [method, setMethod] = useState<HttpMethod>(initialMethod);
    const [url, setUrl] = useState(initialUrl);
    return (
        <ScratchHeader
            {...props}
            method={method}
            onMethodChange={setMethod}
            url={url}
            onUrlChange={setUrl}
            className="w-[980px]"
        />
    );
}

const meta = {
    title: 'stress-tests/ScratchHeader',
    component: Controlled,
    args: { onClear: fn(), canClear: false },
} satisfies Meta<typeof Controlled>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('textbox', { name: 'URL' })).toHaveValue('');
        await expect(canvas.getByRole('button', { name: 'Clear' })).toBeDisabled();
    },
};

export const PickMethodAndUrl: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('combobox', { name: 'Method' }));
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole('option', { name: 'PATCH' }));
        await expect(canvas.getByRole('combobox', { name: 'Method' })).toHaveTextContent('PATCH');
        await waitFor(() => expect(body.queryByRole('listbox')).not.toBeInTheDocument());
        const url = canvas.getByRole('textbox', { name: 'URL' });
        await userEvent.type(url, 'https://api.dev/tasks/7');
        await expect(url).toHaveValue('https://api.dev/tasks/7');
    },
};

export const Filled: Story = {
    args: {
        initialMethod: 'POST',
        initialUrl: 'https://api.dev/tasks?notify=true',
        canClear: true,
    },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Clear' }));
        await expect(args.onClear).toHaveBeenCalledOnce();
    },
};

export const LockedWhileRunning: Story = {
    args: { initialUrl: 'https://api.dev/health', canClear: true, locked: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('textbox', { name: 'URL' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'Clear' })).toBeDisabled();
    },
};
