export interface UserAvatarProps {
    name: string;
    imageUrl?: string | null;
}

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

export function UserAvatar({ name, imageUrl }: UserAvatarProps) {
    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={name}
                className="size-8 rounded-lg object-cover"
            />
        );
    }
    return (
        <span
            title={name}
            className="bg-accent/20 text-accent flex size-8 items-center justify-center rounded-lg font-mono text-xs font-semibold"
        >
            <span aria-hidden>{initials(name)}</span>
            <span className="sr-only">{name}</span>
        </span>
    );
}
