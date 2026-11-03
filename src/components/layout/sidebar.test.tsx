import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { Tooltip } from '@/components/ui/tooltip';

import { Sidebar } from './sidebar';
import { useSidebarCollapsed } from './use-sidebar-collapsed';

function Harness() {
    const [collapsed, setCollapsed] = useSidebarCollapsed();
    return (
        <Tooltip.Provider>
            <Sidebar
                title="Collections"
                collapsed={collapsed}
                onCollapsedChange={setCollapsed}
            >
                <p>tree</p>
            </Sidebar>
        </Tooltip.Provider>
    );
}

afterEach(() => window.localStorage.clear());

describe('Sidebar', () => {
    it('collapses to a rail and remembers it', async () => {
        const { unmount } = render(<Harness />);
        const collapse = screen.getByRole('button', { name: 'Collapse sidebar' });
        expect(collapse).toHaveAttribute('aria-expanded', 'true');

        await userEvent.click(collapse);
        expect(screen.queryByText('tree')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );

        unmount();
        render(<Harness />);
        expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    });

    it('is a named landmark', () => {
        render(<Harness />);
        expect(screen.getByRole('complementary', { name: 'Collections' })).toBeInTheDocument();
    });
});
