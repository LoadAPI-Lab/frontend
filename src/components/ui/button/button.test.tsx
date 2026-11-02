import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

describe('Button', () => {
    it('is a non-submitting button by default', () => {
        render(<Button>Save</Button>);
        expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
    });

    it('does not fire when disabled', async () => {
        const onClick = vi.fn<() => void>();
        render(
            <Button
                disabled
                onClick={onClick}
            >
                Save
            </Button>,
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(onClick).not.toHaveBeenCalled();
    });
});
