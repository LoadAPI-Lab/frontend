import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { emptyDraft, newRow, type RequestDraft } from '@/lib/request-draft';

import { RequestCard } from './request-card';

function Controlled({ initial, pathParams }: { initial: RequestDraft; pathParams: string[] }) {
    const [draft, setDraft] = useState(initial);
    return (
        <RequestCard
            draft={draft}
            onDraftChange={setDraft}
            pathParams={pathParams}
            className="h-[596px] w-[512px]"
        />
    );
}

const meta = {
    title: 'stress-tests/RequestCard',
    render: (args) => <Controlled {...args} />,
    args: {
        initial: {
            ...emptyDraft(),
            body: '{\n  "title": "Buy milk",\n  "externalId": "{{$uuid}}"\n}',
            headers: [
                newRow('Content-Type', 'application/json'),
                newRow('X-Request-Source', 'routelab'),
                newRow('Accept-Language', 'en'),
            ],
        },
        pathParams: ['id'],
    },
} satisfies Meta<{ initial: RequestDraft; pathParams: string[] }>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('tab', { name: 'Headers 3' })).toBeVisible();
        await expect(canvas.getByText('raw · JSON')).toBeVisible();
    },
};

export const Headers: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('tab', { name: 'Headers 3' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Add header' }));
        await expect(canvas.getByRole('tab', { name: 'Headers 3' })).toBeVisible();
        await userEvent.type(canvas.getByRole('textbox', { name: 'Header name 4' }), 'X-Trace');
        await expect(canvas.getByRole('tab', { name: 'Headers 4' })).toBeVisible();
    },
};

export const AuthMasked: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('tab', { name: 'Auth' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Bearer token' }));
        const token = canvas.getByLabelText('Token');
        await userEvent.type(token, 'secret-token');
        await expect(token).toHaveAttribute('type', 'password');
    },
};

export const Params: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('tab', { name: 'Params' }));
        await userEvent.type(canvas.getByLabelText('id'), '42');
        await expect(canvas.getByRole('tab', { name: 'Params 1' })).toBeVisible();
    },
};
