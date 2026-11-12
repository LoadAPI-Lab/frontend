import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
    binaryResponse,
    jsonResponse,
    notFoundResponse,
    refusedOutcome,
    truncatedResponse,
} from './fixtures';
import { prettyBody, ResponseCard, type ResponseCardProps } from './response-card';

const renderCard = (props: Partial<ResponseCardProps>) =>
    render(
        <ResponseCard
            outcome={null}
            problem={null}
            sending={false}
            {...props}
        />,
    );

const card = () => screen.getByRole('region', { name: 'Response' });

describe('prettyBody', () => {
    it('indents JSON and keeps other text as it is', () => {
        expect(prettyBody('{"a":1}')).toBe('{\n  "a": 1\n}');
        expect(prettyBody('plain <b>text</b>')).toBe('plain <b>text</b>');
    });
});

describe('ResponseCard', () => {
    it('explains what Send does before the first response', () => {
        renderCard({});
        expect(within(card()).getByText('No response yet')).toBeVisible();
    });

    it('shows the status, time, size and the formatted body', async () => {
        renderCard({ outcome: jsonResponse });
        expect(within(card()).getByText('200 OK')).toBeVisible();
        expect(within(card()).getByText('49 ms')).toBeVisible();
        expect(within(card()).getByText('22 B')).toBeVisible();
        expect(screen.getByLabelText('Response body')).toHaveTextContent('"name": "Ada"');

        await userEvent.click(screen.getByRole('tab', { name: /^Headers/ }));
        const rows = within(screen.getByRole('table')).getAllByRole('row', { name: /set-cookie/ });
        expect(rows).toHaveLength(2);
    });

    it('shows a slow error response in seconds without a reason phrase', () => {
        renderCard({ outcome: notFoundResponse });
        expect(within(card()).getByText('404')).toBeVisible();
        expect(within(card()).getByText('1.53 s')).toBeVisible();
        expect(screen.getByLabelText('Response body')).toHaveTextContent('Not Found');
    });

    it('notes a binary or cut-off body', () => {
        const { rerender } = renderCard({ outcome: binaryResponse });
        expect(screen.getByText("Binary response (20.0 KB). Its body isn't shown.")).toBeVisible();
        rerender(
            <ResponseCard
                outcome={truncatedResponse}
                problem={null}
                sending={false}
            />,
        );
        expect(screen.getByText(/Only the first 1 MB is shown/)).toBeVisible();
        expect(screen.getByLabelText('Response body')).toHaveTextContent('[1,2,3');
    });

    it('shows a network error instead of a status code', () => {
        renderCard({ outcome: refusedOutcome });
        expect(within(card()).getByText('No response: Connection refused')).toBeVisible();
        expect(within(card()).getByText('3.2 ms')).toBeVisible();
        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('shows why core refused to send', () => {
        renderCard({ outcome: jsonResponse, problem: { kind: 'rateLimited' } });
        expect(screen.getByRole('alert')).toHaveTextContent(/up to 30 a minute/);
        expect(within(card()).queryByText('200 OK')).not.toBeInTheDocument();
    });

    it('says it is waiting while the request is in flight', () => {
        renderCard({ outcome: jsonResponse, sending: true });
        expect(card()).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByRole('status')).toHaveTextContent('Waiting for the response…');
    });
});
