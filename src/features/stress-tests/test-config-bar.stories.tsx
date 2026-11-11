import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DEFAULT_CONFIG, type TestConfig, validateConfig } from './test-config';
import { TestConfigBar, type TestConfigBarProps } from './test-config-bar';

type StoryArgs = Pick<TestConfigBarProps, 'block' | 'phase' | 'onStart' | 'onStop'> & {
    initial: TestConfig;
};

function Controlled({ initial, ...props }: StoryArgs) {
    const [config, setConfig] = useState(initial);
    const issues = validateConfig(config);
    return (
        <TestConfigBar
            {...props}
            config={config}
            onConfigChange={setConfig}
            issues={issues}
            block={Object.keys(issues).length > 0 ? { kind: 'invalidConfig' } : props.block}
        />
    );
}

const meta = {
    title: 'stress-tests/TestConfigBar',
    render: (args) => <Controlled {...args} />,
    args: {
        initial: { targetRps: 300, durationSeconds: 60, rampUpSeconds: 10 },
        block: null,
        phase: 'idle',
        onStart: fn(),
        onStop: fn(),
    },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Start test' }));
        await expect(args.onStart).toHaveBeenCalledOnce();
    },
};

export const NoRoute: Story = {
    args: { initial: DEFAULT_CONFIG, block: { kind: 'noTarget' } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const start = canvas.getByRole('button', { name: 'Start test' });
        await expect(start).toBeDisabled();
        await expect(start).toHaveAccessibleDescription('Pick an endpoint from the sidebar first.');
    },
};

export const UnfilledPathParam: Story = {
    args: { block: { kind: 'pathParam', param: '{id}' } },
};

export const InvalidValues: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const rps = canvas.getByRole('textbox', { name: 'Target RPS' });
        await userEvent.clear(rps);
        await userEvent.type(rps, '2000');
        await userEvent.tab();
        await expect(canvas.getByText('Use 1 to 1000.')).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Start test' })).toBeDisabled();
    },
};

export const RampLongerThanDuration: Story = {
    args: { initial: { targetRps: 300, durationSeconds: 30, rampUpSeconds: 45 } },
};

export const Starting: Story = { args: { phase: 'starting' } };

export const Running: Story = {
    args: { phase: 'running' },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('textbox', { name: 'Target RPS' })).toBeDisabled();
        await userEvent.click(canvas.getByRole('button', { name: 'Stop test' }));
        await expect(args.onStop).toHaveBeenCalledOnce();
    },
};

export const Stopping: Story = { args: { phase: 'stopping' } };
