import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
  return (
    <DestinationPageChrome
      title={t("pages.settings.title")}
      onMenuClick={onMenuClick}
      onBack={onClose}
      backLabel={t("pages.settings.close")}
      backImmediate
      embedded={embedded}
    >
      <p className="destination-page__lede" style={{ color: cv.text.muted }}>
        {t("pages.settings.lede")}
      </p>
      <SettingsForm />
    </DestinationPageChrome>
  );
}
