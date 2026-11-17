import { describe, expect, it } from 'vitest';

import {
    chartsReplayable,
    dayGroup,
    percentChange,
    runHost,
    runPath,
    shortRunId,
    trendWidth,
} from './history-format';

const now = new Date(2026, 10, 9, 10, 0);

describe('dayGroup', () => {
    it('groups by calendar day relative to now', () => {
        expect(dayGroup(new Date(2026, 10, 9, 0, 5).toISOString(), now)).toBe('today');
        expect(dayGroup(new Date(2026, 10, 8, 23, 59).toISOString(), now)).toBe('yesterday');
        expect(dayGroup(new Date(2026, 10, 4, 12).toISOString(), now)).toBe('thisWeek');
        expect(dayGroup(new Date(2026, 9, 20).toISOString(), now)).toBe('earlier');
    });
});

describe('run labels', () => {
    it('shows the path and host of the tested URL', () => {
        expect(runPath('http://testserver:8080/status/429?delay=10ms')).toBe(
            '/status/429?delay=10ms',
        );
        expect(runPath('http://testserver:8080/tasks/{id}')).toBe('/tasks/{id}');
        expect(runHost('https://api.shop.example.com/v2/orders')).toBe('api.shop.example.com');
        expect(runPath('not a url')).toBe('not a url');
    });

    it('shortens the run id', () => {
        expect(shortRunId('7f3a91c2-1111-4222-8333-444455556666')).toBe('7f3a91');
    });

    it('computes a percent change, or nothing from zero', () => {
        expect(percentChange(110, 100)).toBeCloseTo(10);
        expect(percentChange(5, 0)).toBeNull();
    });
});

describe('trendWidth', () => {
    it('sizes each p95 against the slowest run', () => {
        expect(trendWidth(146, 146)).toBe(100);
        expect(trendWidth(73, 146)).toBe(50);
        expect(trendWidth(1, 1000)).toBe(4);
        expect(trendWidth(0, 0)).toBe(0);
    });
});

describe('chartsReplayable', () => {
    const at = new Date(2026, 10, 9, 10, 0).getTime();

    it('is open while a run is live and for an hour after it ends', () => {
        expect(chartsReplayable({ status: 'RUNNING' }, at)).toBe(true);
        expect(
            chartsReplayable(
                { status: 'COMPLETED', finishedAt: new Date(at - 30 * 60_000).toISOString() },
                at,
            ),
        ).toBe(true);
        expect(
            chartsReplayable(
                { status: 'COMPLETED', finishedAt: new Date(at - 61 * 60_000).toISOString() },
                at,
            ),
        ).toBe(false);
        expect(chartsReplayable({ status: 'STOPPED' }, at)).toBe(false);
    });
});
