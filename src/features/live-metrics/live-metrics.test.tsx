import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { runningTotals } from '@/api/live';
import { FakeUPlot } from '@/test/fake-uplot';

import { sampleSnapshot, sampleSnapshots } from './fixtures';
import { LatencyCard } from './latency-card';
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

describe('LatencyCard', () => {
    it('creates the chart once and appends data on updates', () => {
        const { rerender } = render(
            <LatencyCard
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
            <LatencyCard
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
            <LatencyCard
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
            <LatencyCard
                snapshots={[]}
                durationSeconds={60}
                emptyMessage="Nothing yet"
            />,
        );
        expect(screen.getByRole('slider', { name: 'Latency by second' })).toBeDisabled();
    });

    it('destroys the chart on unmount', () => {
        const { unmount } = render(
            <LatencyCard
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
    it('shows each class as a share of all responses', () => {
        render(
            <StatusCodesCard
                statuses={{ '2xx': 978, '3xx': 0, '4xx': 20, '5xx': 2, network: 0 }}
            />,
        );
        const items = screen.getAllByRole('listitem').map((item) => item.textContent);
        expect(items).toEqual(['2xx97.8%', '4xx2.0%', '5xx0.2%']);
    });

    it('adds network errors only when there are some', () => {
        render(
            <StatusCodesCard statuses={{ '2xx': 9, '3xx': 0, '4xx': 0, '5xx': 0, network: 1 }} />,
        );
        expect(screen.getByText('Network')).toBeInTheDocument();
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
