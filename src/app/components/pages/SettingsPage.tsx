import { SettingsForm } from "../settings/SettingsForm";
import { DestinationPageChrome } from "./DestinationPageChrome";
import { cv } from "../../ui/tokens";

export function SettingsPage({
  onMenuClick,
  onClose,
  embedded = false,
}: {
  onMenuClick: () => void;
  /** Dismiss overlay — restores the screen underneath unchanged. */
  onClose: () => void;
  embedded?: boolean;
}) {
  return (
    <DestinationPageChrome
      title="Settings"
      onMenuClick={onMenuClick}
      onBack={onClose}
      backLabel="Close settings"
      backImmediate
      embedded={embedded}
    >
      <p className="destination-page__lede" style={{ color: cv.text.muted }}>
        Display and accessibility
      </p>
      <SettingsForm />
    </DestinationPageChrome>
  );
}
