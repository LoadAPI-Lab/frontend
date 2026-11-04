import { useState } from 'react';

import { cn } from '@/lib/cn';

export interface UserAvatarProps {
    name: string;
    imageUrl?: string | null;
    className?: string;
    /** Hide the initials from assistive tech. Turn off when the avatar is a control's visible label. */
    decorative?: boolean;
}

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

/** Figma node 5:357: 30px, 7px radius, lime initials on lime 15%. */
export function UserAvatar({ name, imageUrl, className, decorative = true }: UserAvatarProps) {
    // the URL that failed to load, so a new URL gets a fresh try
    const [failedUrl, setFailedUrl] = useState<string | null>(null);

    if (imageUrl && imageUrl !== failedUrl) {
        return (
            <img
                src={imageUrl}
                alt=""
                // Google's avatar host answers 403 to requests with a third-party referrer
                referrerPolicy="no-referrer"
                onError={() => setFailedUrl(imageUrl)}
                className={cn('size-7.5 rounded-item object-cover', className)}
            />
        );
    }
    return (
        <span
            aria-hidden={decorative || undefined}
            className={cn(
                'bg-accent/15 text-accent text-sm flex size-7.5 items-center justify-center rounded-item font-bold',
                className,
            )}
        >
            {initials(name)}
        </span>
    );
}
