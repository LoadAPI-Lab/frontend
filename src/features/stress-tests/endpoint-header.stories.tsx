import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

import { EndpointHeader, type EndpointHeaderProps } from './endpoint-header';

function Controlled(props: Omit<EndpointHeaderProps, 'server' | 'onServerChange'>) {
    const [server, setServer] = useState(props.servers[0]?.url ?? '');
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
        collection: 'LoadAPI test server',
        servers: [{ url: 'http://testserver:8080' }, { url: 'http://localhost:8080' }],
    },
} satisfies Meta<typeof Controlled>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralServers: Story = {};

export const OneServer: Story = {
    args: {
        method: 'GET',
        path: '/products/{productId}',
        collection: 'Shop API',
        servers: [{ url: 'https://api.shop.example.com/v2' }],
    },
};

export const NoServers: Story = {
    args: { method: 'DELETE', path: '/products/{productId}', deprecated: true, servers: [] },
};

export const RelativeServerOnly: Story = {
    args: {
        method: 'GET',
        path: '/products',
        collection: 'Shop API',
        servers: [],
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
