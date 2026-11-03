import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '@/components/ui/button';

import { StatusScreen } from './status-screen';

const meta = {
    title: 'layout/StatusScreen',
    component: StatusScreen,
    parameters: { layout: 'fullscreen' },
    args: {
        title: 'Something went wrong',
        body: 'Try again. If it keeps happening, share the request ID with the team.',
        requestId: 'req_tz4a98xxat96iws9zmbrgj3a',
        action: <Button>Try again</Button>,
    },
} satisfies Meta<typeof StatusScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {};
export const NotFound: Story = {
    args: {
        title: 'Page not found',
        body: "The page you opened doesn't exist or was moved.",
        requestId: null,
    },
};
