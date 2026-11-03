import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IconButton } from './icon-button';

describe('IconButton', () => {
    it('is named by its aria-label and does not submit forms', () => {
        render(
            <IconButton aria-label="Collapse sidebar">
                <svg aria-hidden />
            </IconButton>,
        );
        const button = screen.getByRole('button', { name: 'Collapse sidebar' });
        expect(button).toHaveAttribute('type', 'button');
    });
});
