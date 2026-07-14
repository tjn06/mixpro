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
  SavePlus,
  Info,
  PanelTopClose,
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

export const SaveNewIcon = createActionIcon(SavePlus);

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

/** Collapse / dismiss a bottom sheet or panel. */
export const PanelTopCloseIcon = createActionIcon(PanelTopClose);

export const InfoIcon = createActionIcon(Info);
