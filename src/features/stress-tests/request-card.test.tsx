import { EditorView } from '@codemirror/view';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { emptyDraft, newRow, type RequestDraft } from '@/lib/request-draft';

import { RequestCard } from './request-card';

const draft: RequestDraft = {
    ...emptyDraft(),
    body: '{\n  "title": "Buy milk"\n}',
    headers: [newRow('X-Trace', 'abc')],
    auth: { kind: 'bearer', token: 'secret-token' },
    pathParams: { id: '42' },
};

const bodyBox = () => screen.getByRole('textbox', { name: 'Request body' });
const bodyView = () => EditorView.findFromDOM(bodyBox());

function renderCard(readOnly: boolean) {
    const onDraftChange = vi.fn<(next: RequestDraft) => void>();
    const view = render(
        <RequestCard
            draft={draft}
            onDraftChange={onDraftChange}
            pathParams={['id']}
            onFillExample={vi.fn<() => void>()}
            readOnly={readOnly}
        />,
    );
    return { onDraftChange, ...view };
}

describe('RequestCard', () => {
    it('is editable when no run is active', async () => {
        const { onDraftChange } = renderCard(false);
        expect(bodyBox()).not.toHaveAttribute('aria-readonly');
        expect(bodyView()?.state.readOnly).toBe(false);
        expect(screen.getByRole('group', { name: 'Insert placeholder' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Fill with example' })).toBeVisible();
        expect(screen.queryByText('Read-only while the test runs')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: /^Headers/ }));
        expect(screen.getByRole('button', { name: 'Add header' })).toBeVisible();
        await userEvent.type(screen.getByRole('textbox', { name: 'Header value 1' }), 'd');
        expect(onDraftChange).toHaveBeenCalled();
    });

    it('is read-only during a run', async () => {
        const { onDraftChange } = renderCard(true);
        expect(screen.getByRole('region', { name: 'Request' })).toHaveAccessibleDescription(
            'Read-only while the test runs',
        );
        expect(bodyBox()).toHaveAttribute('aria-readonly', 'true');
        expect(bodyView()?.state.readOnly).toBe(true);
        expect(screen.queryByRole('group', { name: 'Insert placeholder' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Fill with example' })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: /^Headers/ }));
        const header = screen.getByRole('textbox', { name: 'Header value 1' });
        expect(header).toHaveAttribute('readonly');
        expect(header).toHaveValue('abc');
        await userEvent.type(header, 'd');
        expect(screen.queryByRole('button', { name: 'Add header' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Remove header 1' })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: 'Auth' }));
        expect(screen.getByRole('button', { name: 'Bearer token' })).toBeDisabled();
        expect(screen.getByLabelText('Token')).toHaveAttribute('readonly');

        await userEvent.click(screen.getByRole('tab', { name: /^Params/ }));
        expect(screen.getByLabelText('id')).toHaveAttribute('readonly');
        expect(screen.getByText('No query parameters')).toBeVisible();
        expect(
            screen.queryByRole('button', { name: 'Add query parameter' }),
        ).not.toBeInTheDocument();

        expect(onDraftChange).not.toHaveBeenCalled();
    });

    it('becomes editable again once the run is final', () => {
        const { rerender } = renderCard(true);
        rerender(
            <RequestCard
                draft={draft}
                onDraftChange={vi.fn<(next: RequestDraft) => void>()}
                pathParams={['id']}
                readOnly={false}
            />,
        );
        expect(bodyBox()).not.toHaveAttribute('aria-readonly');
        expect(bodyView()?.state.readOnly).toBe(false);
        expect(screen.getByRole('group', { name: 'Insert placeholder' })).toBeVisible();
        expect(screen.queryByText('Read-only while the test runs')).not.toBeInTheDocument();
    });
});
