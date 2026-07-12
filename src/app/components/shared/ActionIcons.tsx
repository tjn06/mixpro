import {
  Save,
  Check,
  List,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  FolderOpen,
  Undo2,
  RotateCcw,
  Trash2,
  Pencil,
  Copy,
  Mail,
  MessageSquare,
  Ellipsis,
  X,
  UserRoundCheck,
  UserRound,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const DEFAULT_ICON_SIZE = 16;

/** Shared stroke + a11y — matches prior inline SVG iconProps. */
function actionIconProps(size = DEFAULT_ICON_SIZE) {
  return {
    size,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

function createActionIcon(Icon: LucideIcon) {
  return function ActionIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
    return <Icon {...actionIconProps(size)} />;
  };
}

export const SaveIcon = createActionIcon(Save);

/** Save-as-new — Lucide save-plus paths (not in lucide-react 0.487). */
export function SaveNewIcon({ size = DEFAULT_ICON_SIZE }: { size?: number }) {
  const props = actionIconProps(size);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={props.strokeWidth}
      strokeLinecap={props.strokeLinecap}
      strokeLinejoin={props.strokeLinejoin}
      aria-hidden={props["aria-hidden"]}
    >
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
      <path d="M18 12h4" />
      <path d="M20 10v4" />
    </svg>
  );
}

export const SavedIcon = createActionIcon(Check);

/** User saved config name in header. */
export const ConfigNameIcon = createActionIcon(UserRound);

/** Built-in admin base config in header. */
export const BaseConfigIcon = createActionIcon(ShieldCheck);

/** List with bullets — pick from multiple saved mixes. */
export const LoadIcon = createActionIcon(List);

/** Open saved mix — folder. */
export const GoToIcon = createActionIcon(FolderOpen);

export const UndoIcon = createActionIcon(Undo2);

export const ResetIcon = createActionIcon(RotateCcw);

export const DeleteIcon = createActionIcon(Trash2);

export const RenameIcon = createActionIcon(Pencil);

/** Overflow / more actions (⋯). */
export const MoreIcon = createActionIcon(Ellipsis);

/** Panel expands left — reveal more actions on the card strip. */
export const ExpandActionsIcon = createActionIcon(ArrowLeftFromLine);

/** Collapse expanded action panel back to the card edge. */
export const CollapseActionsIcon = createActionIcon(ArrowRightFromLine);

export const CopyIcon = createActionIcon(Copy);

export const MailIcon = createActionIcon(Mail);

export const MessageIcon = createActionIcon(MessageSquare);

export const CloseIcon = createActionIcon(X);
