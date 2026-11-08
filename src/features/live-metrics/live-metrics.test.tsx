import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { runningTotals } from '@/api/live';
import { FakeUPlot } from '@/test/fake-uplot';

import { sampleSnapshot, sampleSnapshots } from './fixtures';
import { LateWarning } from './late-warning';
import { LiveChartCard, LiveCharts } from './live-charts';
import { zoomAround } from './live-plot';
import { LiveStats } from './live-stats';
import { RunProgress } from './run-progress';
import { StatusCodesCard } from './status-codes-card';

const idleTotals = runningTotals([]);

function stat(label: RegExp) {
    const term = screen.getByText(label, { selector: 'dt' });
    return term.parentElement?.querySelector('dd')?.textContent;
}

describe('LiveStats', () => {
    it('shows dashes before the first snapshot', () => {
        render(
            <LiveStats
                live={{ latest: null, totals: idleTotals }}
                targetRps={300}
            />,
        );
        expect(stat(/^RPS · target 300$/)).toBe('—');
        expect(stat(/^p50/)).toBe('—');
        expect(stat(/^p95$/)).toBe('—');
        expect(stat(/^errors$/)).toBe('—');
    });

    it('shows the latest second and the running error rate', () => {
        const snapshots = sampleSnapshots(4);
        const latest = snapshots.at(-1) ?? null;
        render(
            <LiveStats
                live={{ latest, totals: runningTotals(snapshots) }}
                targetRps={300}
            />,
        );
        expect(stat(/^RPS/)).toBe('297.4');
        expect(stat(/^p50/)).toBe(`${latest?.targets[0]?.responseTime?.p50Ms}ms`);
        expect(stat(/^errors · 4 of 1,180$/)).toBe('0.3%');
    });
});

describe('LiveChartCard', () => {
    it('creates the chart once and appends data on updates', () => {
        const { rerender } = render(
            <LiveChartCard
                kind="latency"
                snapshots={[]}
                durationSeconds={60}
                emptyMessage="Live results show here once the test starts."
            />,
        );
        expect(
            screen.getByRole('figure', { name: 'Live results show here once the test starts.' }),
        ).toBeInTheDocument();
        expect(FakeUPlot.instances).toHaveLength(1);

        const snapshots = [sampleSnapshot(1), sampleSnapshot(2)];
        rerender(
            <LiveChartCard
                kind="latency"
                snapshots={snapshots}
                durationSeconds={60}
                emptyMessage="Live results show here once the test starts."
            />,
        );

        expect(FakeUPlot.instances).toHaveLength(1);
        const [chart] = FakeUPlot.instances;
        expect(chart?.destroyed).toBe(false);
        expect(chart?.data).toEqual([
            [1, 2],
            snapshots.map((snapshot) => snapshot.targets[0]?.responseTime?.p50Ms),
            snapshots.map((snapshot) => snapshot.targets[0]?.responseTime?.p95Ms),
            snapshots.map((snapshot) => snapshot.targets[0]?.responseTime?.p99Ms),
        ]);
        expect(
            screen.getByRole('figure', { name: /^Latency chart\. Latest second: p50/ }),
        ).toBeInTheDocument();
    });

    it('lets the keyboard browse the seconds', () => {
        const snapshots = [sampleSnapshot(1), sampleSnapshot(2), sampleSnapshot(3)];
        render(
            <LiveChartCard
                kind="latency"
                snapshots={snapshots}
                durationSeconds={60}
                emptyMessage="Nothing yet"
            />,
        );
        const slider = screen.getByRole('slider', { name: 'Latency by second' });
        const [chart] = FakeUPlot.instances;

        fireEvent.focus(slider);
        expect(slider).toHaveValue('2');
        expect(chart?.cursor).toEqual({ left: 30, top: 0 });

        fireEvent.change(slider, { target: { value: '0' } });
        const first = snapshots[0]?.targets[0]?.responseTime;
        expect(slider).toHaveAttribute(
            'aria-valuetext',
            `1s: p50 ${first?.p50Ms} ms, p95 ${first?.p95Ms} ms, p99 ${first?.p99Ms} ms`,
        );
        expect(chart?.cursor).toEqual({ left: 10, top: 0 });

        fireEvent.keyDown(slider, { key: 'End' });
        expect(slider).toHaveValue('2');
        fireEvent.keyDown(slider, { key: 'ArrowLeft' });
        expect(slider).toHaveValue('1');
        expect(chart?.cursor).toEqual({ left: 20, top: 0 });
        fireEvent.keyDown(slider, { key: 'PageDown' });
        expect(slider).toHaveValue('0');

        fireEvent.blur(slider);
        expect(chart?.cursor).toEqual({ left: -10, top: -10 });
    });

    it('cannot be browsed before any data arrives', () => {
        render(
            <LiveChartCard
                kind="latency"
                snapshots={[]}
                durationSeconds={60}
                emptyMessage="Nothing yet"
            />,
        );
        expect(screen.getByRole('slider', { name: 'Latency by second' })).toBeDisabled();
    });

    it('draws actual against target RPS', () => {
        const snapshots = [sampleSnapshot(1), sampleSnapshot(2)];
        render(
            <LiveChartCard
                kind="throughput"
                snapshots={snapshots}
                durationSeconds={60}
                emptyMessage="Nothing yet"
            />,
        );
        const [chart] = FakeUPlot.instances;
        expect(chart?.data).toEqual([
            [1, 2],
            [297.4, 297.4],
            [300, 300],
        ]);
        expect(
            screen.getByRole('figure', {
                name: 'Throughput chart. Latest second: 297 RPS against a target of 300.',
            }),
        ).toBeInTheDocument();
    });

    it('stacks error bars but reads out the counts per class', () => {
        const snapshots = [
            sampleSnapshot(1),
            sampleSnapshot(2, {
                targets: [
                    {
                        method: 'GET',
                        url: 'https://api.dev/tasks',
                        successCount: 90,
                        errorCount: 4,
                        lateCount: 0,
                        statusCodes: { '200': 90, '404': 3, '500': 2 },
                        errors: { timeout: 2 },
                    },
                ],
            }),
        ];
        render(
            <LiveChartCard
                kind="errors"
                snapshots={snapshots}
                durationSeconds={60}
                emptyMessage="Nothing yet"
            />,
        );
        const [chart] = FakeUPlot.instances;
        expect(chart?.data).toEqual([
            [1, 2],
            [7, 7],
            [7, 5],
            [6, 3],
        ]);
        const slider = screen.getByRole('slider', { name: 'Errors by second' });
        fireEvent.focus(slider);
        expect(slider).toHaveAttribute('aria-valuetext', '2s: 4xx 3, 5xx 2, Network 2');
    });

    it('shows each error class as a share of the whole run in the legend', () => {
        render(
            <LiveChartCard
                kind="errors"
                snapshots={[
                    sampleSnapshot(1, {
                        targets: [
                            {
                                method: 'GET',
                                url: 'https://api.dev/tasks',
                                successCount: 95,
                                errorCount: 2,
                                lateCount: 0,
                                statusCodes: { '200': 95, '404': 2, '503': 1 },
                                errors: { timeout: 2 },
                            },
                        ],
                    }),
                ]}
                durationSeconds={60}
                emptyMessage="Nothing yet"
            />,
        );
        const legend = screen.getByRole('list', { name: 'Errors legend' });
        expect(legend).toHaveTextContent('4xx2.0%');
        expect(legend).toHaveTextContent('5xx1.0%');
        expect(legend).toHaveTextContent('Network2.0%');
    });

    it('adds dashed service-time lines when the toggle is on', async () => {
        render(
            <LiveChartCard
                kind="latency"
                snapshots={[sampleSnapshot(1)]}
                durationSeconds={60}
                emptyMessage="Nothing yet"
            />,
        );
        const toggle = screen.getByRole('button', { name: 'Service time' });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await userEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-pressed', 'true');

        const chart = FakeUPlot.instances.at(-1);
        expect(chart?.data).toHaveLength(6);
        expect(screen.getByText('service p99')).toBeInTheDocument();
    });

    it('stacks latency, throughput and errors charts', () => {
        render(
            <LiveCharts
                snapshots={[sampleSnapshot(1)]}
                durationSeconds={60}
                emptyMessage="Nothing yet"
            />,
        );
        expect(FakeUPlot.instances).toHaveLength(3);
        expect(screen.getByRole('region', { name: 'Latency' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Throughput' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Errors' })).toBeInTheDocument();
    });

    it('zooms all three charts together from the keyboard', () => {
        const snapshots = Array.from({ length: 40 }, (_, index) => sampleSnapshot(index + 1));
        render(
            <LiveCharts
                snapshots={snapshots}
                durationSeconds={40}
                emptyMessage="Nothing yet"
            />,
        );
        const slider = screen.getByRole('slider', { name: 'Latency by second' });
        fireEvent.focus(slider);
        fireEvent.keyDown(slider, { key: 'Home' });
        fireEvent.keyDown(slider, { key: '+' });

        expect(screen.getByText('Showing 1s to 21s')).toBeInTheDocument();
        expect(FakeUPlot.instances.map((chart) => chart.scale)).toEqual([
            { min: 1, max: 21 },
            { min: 1, max: 21 },
            { min: 1, max: 21 },
        ]);

        fireEvent.click(screen.getByRole('button', { name: 'Reset zoom' }));
        expect(screen.getByText(/Drag across a chart to zoom in/)).toBeInTheDocument();
        expect(FakeUPlot.instances[0]?.scale).toEqual({ min: 1, max: 40 });
    });

    it('destroys the chart on unmount', () => {
        const { unmount } = render(
            <LiveChartCard
                kind="latency"
                snapshots={[]}
                durationSeconds={null}
                emptyMessage="Nothing yet"
            />,
        );
        unmount();
        expect(FakeUPlot.instances.every((chart) => chart.destroyed)).toBe(true);
    });
});

describe('StatusCodesCard', () => {
    it('lists each exact code with its count and share', () => {
        render(<StatusCodesCard codes={{ '503': 2, '200': 978, '404': 20 }} />);
        const rows = screen
            .getAllByRole('row')
            .slice(1)
            .map((row) => row.textContent);
        expect(rows).toEqual(['20097897.8%', '404202.0%', '50320.2%']);
    });

    it('adds network errors by kind after the codes', () => {
        render(
            <StatusCodesCard
                codes={{ '200': 96 }}
                networkErrors={{
                    timeout: 3,
                    connection_refused: 1,
                    connection_reset: 0,
                    dns: 0,
                    other: 0,
                }}
            />,
        );
        expect(screen.getByRole('rowheader', { name: 'Timeout' })).toBeInTheDocument();
        expect(screen.getByRole('rowheader', { name: 'Connection refused' })).toBeInTheDocument();
        expect(screen.queryByRole('rowheader', { name: 'DNS' })).not.toBeInTheDocument();
        expect(screen.getByRole('row', { name: /Timeout/ })).toHaveTextContent('3.0%');
    });

    it('says when there are no responses yet', () => {
        render(<StatusCodesCard codes={{}} />);
        expect(screen.getByText('No responses yet.')).toBeInTheDocument();
    });
});

describe('zoomAround', () => {
    it('halves the window around a second and stays inside the run', () => {
        expect(zoomAround([1, 61], [1, 61], 30, 0.5)).toEqual([15, 45]);
        expect(zoomAround([1, 61], [1, 61], 2, 0.5)).toEqual([1, 31]);
        expect(zoomAround([1, 61], [1, 61], 60, 0.5)).toEqual([31, 61]);
    });

    it('never goes below four seconds and resets when zoomed all the way out', () => {
        expect(zoomAround([10, 14], [1, 61], 12, 0.5)).toEqual([10, 14]);
        expect(zoomAround([15, 45], [1, 61], 30, 2)).toBeNull();
    });
});

describe('LateWarning', () => {
    it('says how many requests went out late', () => {
        render(
            <LateWarning
                late={312}
                requests={12_480}
            />,
        );
        expect(
            screen.getByText(
                '312 requests (2.5%) went out later than scheduled, so latency is understated. Try a lower target RPS.',
            ),
        ).toBeInTheDocument();
    });

    it('renders nothing when every request was on time', () => {
        const { container } = render(
            <LateWarning
                late={0}
                requests={100}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });
});

describe('RunProgress', () => {
    it('shows the status, the clock and the progress', () => {
        render(
            <RunProgress
                status="RUNNING"
                elapsedSeconds={42}
                durationSeconds={60}
            />,
        );
        expect(screen.getByRole('status')).toHaveTextContent('Running');
        expect(screen.getByText('00:42 / 01:00')).toBeInTheDocument();
        expect(screen.getByRole('progressbar', { name: 'Test progress' })).toHaveAttribute(
            'value',
            '70',
        );
    });

    it('fills the bar when the run completes', () => {
        render(
            <RunProgress
                status="COMPLETED"
                elapsedSeconds={59}
                durationSeconds={60}
            />,
        );
        expect(screen.getByRole('progressbar')).toHaveAttribute('value', '100');
    });
});
