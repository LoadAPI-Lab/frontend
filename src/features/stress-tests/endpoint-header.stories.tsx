import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

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
        servers: [
            { url: 'http://testserver:8080', description: 'From containers in the Docker network' },
            { url: 'http://localhost:8080', description: 'From the host machine' },
        ],
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
