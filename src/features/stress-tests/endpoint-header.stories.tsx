import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { EndpointHeader, type EndpointHeaderProps } from './endpoint-header';

function Controlled({
    initialServer = '',
    ...props
}: Omit<EndpointHeaderProps, 'server' | 'onServerChange'> & { initialServer?: string }) {
    const [server, setServer] = useState(initialServer);
    return (
        <EndpointHeader
            {...props}
            server={server}
            onServerChange={setServer}
            className="w-[980px]"
        />
    );
}

const meta = {
    title: 'stress-tests/EndpointHeader',
    component: Controlled,
    args: {
        method: 'POST',
        path: '/tasks',
        summary: 'Create a task',
        initialServer: 'http://testserver:8080',
    },
} satisfies Meta<typeof Controlled>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EditableBaseUrl: Story = {
    args: { serverPlaceholder: 'http://testserver:8080' },
    play: async ({ canvasElement }) => {
        const input = within(canvasElement).getByRole('textbox', { name: 'Base URL' });
        await expect(input).toHaveValue('http://testserver:8080');
        await userEvent.clear(input);
        await userEvent.type(input, 'http://localhost:9090');
        await expect(input).toHaveValue('http://localhost:9090');
    },
};

export const NoServers: Story = {
    args: {
        method: 'DELETE',
        path: '/products/{productId}',
        deprecated: true,
        initialServer: '',
    },
};

export const RelativeServerOnly: Story = {
    args: {
        method: 'GET',
        path: '/products',
        initialServer: '',
        relativeServer: '/v2',
    },
    play: async ({ canvasElement }) => {
        const input = within(canvasElement).getByRole('textbox', { name: 'Base URL' });
        await expect(input).toHaveAttribute('placeholder', 'https://api.example.com/v2');
        await expect(input).toHaveAccessibleDescription(
            "This doc's server is a relative path (/v2). Enter the full URL to test against.",
        );
    },
};

export const LockedWhileRunning: Story = {
    args: { method: 'GET', path: '/status/429', serverLocked: true },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('textbox', { name: 'Base URL' }),
        ).toBeDisabled();
    },
};
