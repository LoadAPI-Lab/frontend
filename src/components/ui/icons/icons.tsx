import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function LogoMark(props: IconProps) {
    return (
        <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            aria-hidden
            {...props}
        >
            <path
                d="M7.04167 1.08333L1.625 7.58333H5.95833L5.41667 11.9167L10.8333 5.41667H6.5L7.04167 1.08333Z"
                stroke="currentColor"
                strokeWidth="1.51667"
            />
        </svg>
    );
}

export function PlusIcon(props: IconProps) {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            {...props}
        >
            <path
                d="M6 2.5V6M6 6V9.5M6 6H2.5M6 6H9.5"
                stroke="currentColor"
                strokeWidth="1.2"
            />
        </svg>
    );
}

export function ChevronLeftIcon(props: IconProps) {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            {...props}
        >
            <path
                d="M7.5 3L4.5 6L7.5 9"
                stroke="currentColor"
                strokeWidth="1.2"
            />
        </svg>
    );
}

export function UploadIcon(props: IconProps) {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            {...props}
        >
            <path
                d="M6 7.5V1.5M8.5 4L6 1.5L3.5 4M2.5 10.5H9.5"
                stroke="currentColor"
                strokeWidth="1.1"
            />
        </svg>
    );
}
