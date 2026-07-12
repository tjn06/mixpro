import {
  Save,
  Check,
  List,
  ChevronRight,
  Undo2,
  RotateCcw,
  Trash2,
  Pencil,
  Copy,
  Mail,
  MessageSquare,
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

export const SavedIcon = createActionIcon(Check);

/** List with bullets — pick from multiple saved mixes. */
export const LoadIcon = createActionIcon(List);

/** Simple right arrow — go to / open. */
export const GoToIcon = createActionIcon(ChevronRight);

export const UndoIcon = createActionIcon(Undo2);

export const ResetIcon = createActionIcon(RotateCcw);

export const DeleteIcon = createActionIcon(Trash2);

export const RenameIcon = createActionIcon(Pencil);

export const CopyIcon = createActionIcon(Copy);

export const MailIcon = createActionIcon(Mail);

export const MessageIcon = createActionIcon(MessageSquare);
