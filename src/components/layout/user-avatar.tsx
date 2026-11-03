import { cn } from '@/lib/cn';

export interface UserAvatarProps {
    name: string;
    imageUrl?: string | null;
    className?: string;
}

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

/** Figma node 5:357: 30px, 7px radius, lime initials on lime 15%. Decorative: name the surrounding control instead. */
export function UserAvatar({ name, imageUrl, className }: UserAvatarProps) {
    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt=""
                className={cn('size-7.5 rounded-item object-cover', className)}
            />
        );
    }
    return (
        <span
            aria-hidden
            className={cn(
                'bg-accent/15 text-accent text-sm flex size-7.5 items-center justify-center rounded-item font-bold',
                className,
            )}
        >
            {initials(name)}
        </span>
    );
}
