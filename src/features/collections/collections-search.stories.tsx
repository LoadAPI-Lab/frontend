import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CollectionsSearch, type CollectionsSearchProps } from './collections-search';

function Controlled(args: CollectionsSearchProps) {
    const [value, setValue] = useState(args.value);
    return (
        <CollectionsSearch
            {...args}
            value={value}
            onChange={(next) => {
                setValue(next);
                args.onChange(next);
            }}
        />
    );
}

const meta = {
    title: 'collections/CollectionsSearch',
    component: CollectionsSearch,
    args: { value: '', onChange: fn(), className: 'w-60' },
} satisfies Meta<typeof CollectionsSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithQuery: Story = {
    args: { value: 'products' },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Clear search' }));
        await expect(args.onChange).toHaveBeenCalledWith('');
    },
};

export const TypeAndEscape: Story = {
    render: (args) => <Controlled {...args} />,
    play: async ({ canvasElement }) => {
        const box = within(canvasElement).getByRole('searchbox', { name: 'Search endpoints' });
        await userEvent.type(box, 'get /tasks');
        await expect(box).toHaveValue('get /tasks');
        await userEvent.keyboard('{Escape}');
        await expect(box).toHaveValue('');
    },
};
