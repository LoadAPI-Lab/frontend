import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { runningTotals, snapshotLatency } from '@/api/live';

import { sampleSnapshot, sampleSnapshots } from './fixtures';
import { LiveCharts } from './live-charts';
import { LiveStats } from './live-stats';
import { RunProgress } from './run-progress';
import { StatusCodesCard } from './status-codes-card';

interface PanelProps {
    seconds: number;
    live?: boolean;
    troubled?: boolean;
}

function Panel({ seconds, live = false, troubled = false }: PanelProps) {
    const [snapshots, setSnapshots] = useState(() => sampleSnapshots(seconds, troubled));
    useEffect(() => {
        const timer = live
            ? setInterval(() => {
                  setSnapshots((current) => [...current, sampleSnapshot(current.length + 1)]);
              }, 1000)
            : null;
        return () => {
            if (timer !== null) {
                clearInterval(timer);
            }
        };
    }, [live]);
    const totals = runningTotals(snapshots);
    const latest = snapshots.at(-1) ?? null;
    const elapsed = snapshots.at(-1)?.elapsedSeconds ?? 0;

    return (
        <div className="flex w-[980px] flex-col gap-3">
            <div className="flex justify-end">
                <RunProgress
                    status={elapsed >= 60 ? 'COMPLETED' : 'RUNNING'}
                    elapsedSeconds={elapsed}
                    durationSeconds={60}
                />
            </div>
            <LiveStats
                rps={latest?.actualRps ?? null}
                latency={latest ? snapshotLatency(latest) : null}
                totals={totals}
                targetRps={300}
            />
            <div className="ml-auto flex w-[457px] flex-col gap-3">
                <LiveCharts
                    snapshots={snapshots}
                    durationSeconds={60}
                    emptyMessage="Live results appear here once the test starts."
                />
                <StatusCodesCard
                    codes={totals.codes}
                    networkErrors={totals.networkErrors}
                />
            </div>
        </div>
    );
}

const meta = {
    title: 'live-metrics/LivePanel',
    component: Panel,
    args: { seconds: 42 },
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('status')).toHaveTextContent('Running');
        await expect(canvas.getByText('00:42 / 01:00')).toBeVisible();
        await waitFor(() => expect(canvasElement.querySelector('canvas')).not.toBeNull());
        await expect(
            canvas.getByRole('figure', { name: /^Latency chart\. Latest second/ }),
        ).toBeVisible();
    },
};

export const KeyboardBrowsing: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvasElement.querySelector('canvas')).not.toBeNull());
        const slider = canvas.getByRole('slider', { name: 'Latency by second' });
        slider.focus();
        await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
        await expect(slider).toHaveAttribute('aria-valuetext', expect.stringMatching(/^40s: p50/));
        await waitFor(() => expect(canvas.getByTestId('chart-tooltip')).toHaveTextContent('40s'));
    },
};

export const AllCharts: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvasElement.querySelectorAll('canvas')).toHaveLength(3));
        await expect(
            canvas.getByRole('figure', { name: /^Throughput chart\. Latest second/ }),
        ).toBeVisible();
        await expect(canvas.getByRole('figure', { name: /^Errors chart\./ })).toBeVisible();
    },
};

export const ErrorsWithTrouble: Story = {
    args: { troubled: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvasElement.querySelector('canvas')).not.toBeNull());
        const badge = canvas.getByText(/^\d+ late$/);
        await expect(badge).toBeVisible();
        await expect(badge).toHaveTextContent(/went out later than scheduled/);
        await expect(canvas.getByRole('rowheader', { name: 'Timeout' })).toBeVisible();
    },
};

export const ServiceTime: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvasElement.querySelectorAll('canvas')).toHaveLength(3));
        await userEvent.click(canvas.getByRole('button', { name: 'Service time' }));
        await expect(canvas.getByText('service p95')).toBeVisible();
        await waitFor(() => expect(canvasElement.querySelectorAll('canvas')).toHaveLength(3));
    },
};

export const Zoomed: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvasElement.querySelectorAll('canvas')).toHaveLength(3));
        const slider = canvas.getByRole('slider', { name: 'Throughput by second' });
        slider.focus();
        await userEvent.keyboard('{Home}+');
        await expect(canvas.getAllByText(/· 1s to 31s$/)).toHaveLength(3);
        const [reset] = canvas.getAllByRole('button', { name: 'Reset zoom' });
        if (reset) {
            await userEvent.click(reset);
        }
        await expect(canvas.queryAllByRole('button', { name: 'Reset zoom' })).toHaveLength(0);
        await expect(canvas.getAllByText(/· drag to zoom$/)).toHaveLength(3);
    },
};

export const Ticking: Story = { args: { seconds: 5, live: true } };

export const Empty: Story = {
    args: { seconds: 0 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.getAllByRole('figure', {
                name: 'Live results appear here once the test starts.',
            }).length,
        ).toBeGreaterThan(0);
        await expect(canvas.getAllByText('—').length).toBeGreaterThan(0);
    },
};

export const Completed: Story = {
    args: { seconds: 60 },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('status')).toHaveTextContent('Completed');
        await expect(within(canvasElement).getByRole('progressbar')).toHaveAttribute(
            'value',
            '100',
        );
    },
};
