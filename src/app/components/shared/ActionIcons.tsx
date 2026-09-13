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
  ScrollText,
  Ellipsis,
  X,
  UserRoundCheck,
  UserRound,
  ShieldCheck,
  SavePlus,
  Info,
  PanelBottomOpen,
  PanelBottomClose,
  Scale,
  ChevronsUpDown,
  Smartphone,
  CalendarDays,
  ListFilter,
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

/** Edit / revise text content (not the mix pencil). */
export const ModifyIcon = createActionIcon(ScrollText);

export const CloseIcon = createActionIcon(X);

/** Reveal a bottom actions panel. */
export const PanelBottomOpenIcon = createActionIcon(PanelBottomOpen);

/** Hide a bottom actions panel. */
export const PanelBottomCloseIcon = createActionIcon(PanelBottomClose);

export const InfoIcon = createActionIcon(Info);

/** Open kg ↔ gram unit helper on weight fields. */
export const ScaleIcon = createActionIcon(Scale);

/** Open mixer-style swipe adjuster for gram fields. */
export const SwipeAdjustIcon = createActionIcon(ChevronsUpDown);

/** Keep phone screen awake (Wake Lock) while locked calculator is open. */
export const KeepAwakeIcon = createActionIcon(Smartphone);

/** Date / calendar day control. */
export const CalendarIcon = createActionIcon(CalendarDays);

/** Apply or set a list filter (e.g. session date filter). */
export const FilterIcon = createActionIcon(ListFilter);
