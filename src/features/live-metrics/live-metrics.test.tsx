import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { runningTotals } from '@/api/live';
import { FakeUPlot } from '@/test/fake-uplot';

import { sampleSnapshot, sampleSnapshots } from './fixtures';
import { LateBadge } from './late-badge';
import { LiveChartCard, LiveCharts } from './live-charts';
import { appendFrame, isSingleAppend, zoomAround } from './live-plot';
import { LiveStats } from './live-stats';
import { RunFailure } from './run-failure';
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
                rps={null}
                latency={null}
                totals={idleTotals}
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
                rps={latest?.actualRps ?? null}
                latency={latest?.targets[0]?.responseTime ?? null}
                totals={runningTotals(snapshots)}
                targetRps={300}
            />,
        );
        expect(stat(/^RPS/)).toBe('297.4');
        expect(stat(/^p50/)).toBe(`${latest?.targets[0]?.responseTime?.p50Ms}ms`);
        expect(stat(/^errors · 4 of 1,180$/)).toBe('0.3%');
    });

    it('labels the numbers as whole-run results once the run is over', () => {
        const { container } = render(
            <LiveStats
                rps={99.8}
                latency={{ p50Ms: 48, p95Ms: 134, p99Ms: 212 }}
                totals={{ requests: 998, errors: 3, errorRate: 0.003 }}
                targetRps={100}
                scope="run"
            />,
        );
        expect(container.querySelector('dl')).toHaveAttribute(
            'aria-label',
            'Results for the whole run',
        );
        expect(stat(/^avg RPS · target 100$/)).toBe('99.8');
        expect(stat(/^p50 · whole run$/)).toBe('48ms');
        expect(stat(/^p95 · whole run$/)).toBe('134ms');
        expect(stat(/^errors · 3 of 998$/)).toBe('0.3%');
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

        expect(screen.getAllByText(/· 1s to 21s$/)).toHaveLength(3);
        expect(FakeUPlot.instances.map((chart) => chart.scale)).toEqual([
            { min: 1, max: 21 },
            { min: 1, max: 21 },
            { min: 1, max: 21 },
        ]);

        const [reset] = screen.getAllByRole('button', { name: 'Reset zoom' });
        if (reset) {
            fireEvent.click(reset);
        }
        expect(screen.queryAllByRole('button', { name: 'Reset zoom' })).toHaveLength(0);
        expect(screen.getAllByText(/· drag to zoom$/)).toHaveLength(3);
        expect(FakeUPlot.instances[0]?.scale).toEqual({ min: 1, max: 40 });
    });

    it('collapses a chart card from its title and remembers it', () => {
        const props = {
            snapshots: [sampleSnapshot(1)],
            durationSeconds: 60,
            emptyMessage: 'Nothing yet',
        };
        const first = render(<LiveCharts {...props} />);
        const toggle = screen.getByRole('button', { name: 'Throughput' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('figure', { name: /^Throughput chart/ })).not.toBeInTheDocument();
        expect(screen.getByText('297 of 300 RPS')).toBeInTheDocument();
        expect(FakeUPlot.instances.filter((chart) => !chart.destroyed)).toHaveLength(2);
        expect(screen.getByRole('region', { name: 'Throughput' })).toBeInTheDocument();

        first.unmount();
        render(<LiveCharts {...props} />);
        expect(screen.getByRole('button', { name: 'Throughput' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('enlarges a chart into a dialog that keeps the shared zoom', async () => {
        render(
            <LiveCharts
                snapshots={Array.from({ length: 40 }, (_, index) => sampleSnapshot(index + 1))}
                durationSeconds={40}
                emptyMessage="Nothing yet"
            />,
        );
        const slider = screen.getByRole('slider', { name: 'Latency by second' });
        fireEvent.focus(slider);
        fireEvent.keyDown(slider, { key: 'Home' });
        fireEvent.keyDown(slider, { key: '+' });

        await userEvent.click(screen.getByRole('button', { name: 'Enlarge the Latency chart' }));

        const dialog = await screen.findByRole('dialog', { name: 'Latency' });
        expect(dialog).toHaveTextContent('· 1s to 21s');
        expect(FakeUPlot.instances).toHaveLength(4);
        expect(FakeUPlot.instances.at(-1)?.scale).toEqual({ min: 1, max: 21 });

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
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

describe('appendFrame', () => {
    const previous: [number[], (number | null)[]] = [
        [1, 2],
        [40, 50],
    ];
    const next: [number[], (number | null)[]] = [
        [1, 2, 3],
        [40, 50, 70],
    ];

    it('slides a new line point in from the previous one', () => {
        expect(appendFrame(previous, next, 0, false)).toEqual([
            [1, 2, 2],
            [40, 50, 50],
        ]);
        expect(appendFrame(previous, next, 0.5, false)).toEqual([
            [1, 2, 2.5],
            [40, 50, 60],
        ]);
        expect(appendFrame(previous, next, 1, false)).toEqual(next);
    });

    it('grows a new bar from zero in place', () => {
        expect(appendFrame(previous, next, 0.5, true)).toEqual([
            [1, 2, 3],
            [40, 50, 35],
        ]);
    });

    it('only animates when exactly one second was added', () => {
        expect(isSingleAppend(previous, next)).toBe(true);
        expect(isSingleAppend([[], []], [[1], [40]])).toBe(false);
        expect(
            isSingleAppend(previous, [
                [1, 2, 3, 4],
                [40, 50, 60, 70],
            ]),
        ).toBe(false);
        expect(
            isSingleAppend(previous, [
                [5, 6, 7],
                [1, 2, 3],
            ]),
        ).toBe(false);
    });
});

describe('RunFailure', () => {
    it('keeps the failure reason on the page', () => {
        render(<RunFailure reason="The worker lost its connection to the target." />);
        expect(
            screen.getByText('The worker lost its connection to the target.', { exact: false }),
        ).toHaveTextContent('Test failed The worker lost its connection to the target.');
    });
});

describe('LateBadge', () => {
    it('shows a short count and explains it to screen readers', () => {
        render(
            <LateBadge
                late={312}
                requests={12_480}
            />,
        );
        expect(
            screen.getByRole('button', {
                name: '312 late. 312 requests (2.5%) went out later than scheduled, so latency is understated. Try a lower target RPS.',
            }),
        ).toBeInTheDocument();
    });

    it('renders nothing when every request was on time', () => {
        const { container } = render(
            <LateBadge
                late={0}
                requests={100}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('sits inside the RPS card instead of adding a row', () => {
        render(
            <LiveStats
                rps={98}
                latency={null}
                totals={{ requests: 1000, errors: 0, errorRate: 0, late: 3 }}
                targetRps={100}
            />,
        );
        expect(stat(/^RPS · target 100$/)).toContain('3 late');
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
