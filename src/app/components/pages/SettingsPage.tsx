import { SettingsForm } from "../settings/SettingsForm";
import { DestinationPageChrome } from "./DestinationPageChrome";
import { cv } from "../../ui/tokens";

export function SettingsPage({
  onMenuClick,
  embedded = false,
}: {
  onMenuClick: () => void;
  embedded?: boolean;
}) {
  return (
    <DestinationPageChrome
      title="Settings"
      onMenuClick={onMenuClick}
      embedded={embedded}
    >
      <div className="destination-page__stack">
        <p className="destination-page__lede" style={{ color: cv.text.muted }}>
          Display and accessibility
        </p>
        <SettingsForm />
      </div>
    </DestinationPageChrome>
  );
}
