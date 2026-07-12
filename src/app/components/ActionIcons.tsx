import React from "react";

const DEFAULT_ICON_SIZE = 16;

function iconProps(size = DEFAULT_ICON_SIZE) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function SaveIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

export function SavedIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** List with bullets — pick from multiple saved mixes. */
export function LoadIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

/** Simple right arrow — go to / open. */
export function GoToIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function UndoIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M3 10h10a5 5 0 0 1 5 5v1" />
      <path d="M3 10l4-4" />
      <path d="M3 10l4 4" />
    </svg>
  );
}

export function ResetIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function DeleteIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function RenameIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function CopyIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function MailIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

export function MessageIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
