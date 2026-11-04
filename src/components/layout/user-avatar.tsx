import { useState } from 'react';

import { cn } from '@/lib/cn';

export interface UserAvatarProps {
    name: string;
    imageUrl?: string | null;
    className?: string;
    decorative?: boolean;
}

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

export function UserAvatar({ name, imageUrl, className, decorative = true }: UserAvatarProps) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);

    if (imageUrl && imageUrl !== failedUrl) {
        return (
            <img
                src={imageUrl}
                alt=""
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
