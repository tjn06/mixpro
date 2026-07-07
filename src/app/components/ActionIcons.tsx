import React from "react";

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SaveIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

export function SavedIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** List with bullets — pick from multiple saved mixes. */
export function LoadIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

export function UndoIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 10h10a5 5 0 0 1 5 5v1" />
      <path d="M3 10l4-4" />
      <path d="M3 10l4 4" />
    </svg>
  );
}
