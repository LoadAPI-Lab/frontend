import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UserAvatar } from './user-avatar';

describe('UserAvatar', () => {
    it('shows the image without sending a referrer', () => {
        const { container } = render(
            <UserAvatar
                name="Ada Lovelace"
                imageUrl="https://example.com/ada.png"
            />,
        );
        const img = container.querySelector('img');
        expect(img).toHaveAttribute('src', 'https://example.com/ada.png');
        expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    });

    it('falls back to initials when the image fails to load', () => {
        const { container } = render(
            <UserAvatar
                name="Ada Lovelace"
                imageUrl="https://example.com/broken.png"
            />,
        );
        const img = container.querySelector('img');
        expect(img).not.toBeNull();
        if (img) {
            fireEvent.error(img);
        }
        expect(container.querySelector('img')).toBeNull();
        expect(screen.getByText('AL')).toBeInTheDocument();
    });
});
