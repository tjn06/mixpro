import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  CollapsePanelIcon,
  ExpandPanelIcon,
} from "../shared/ActionIcons";

type VizPanelId = "plan" | "section" | "iso";

/** Accordion stack for plan / section / 3D — plan open by default. */
export function RepairVizAccordion({
  plan,
  section,
  iso,
  labels,
}: {
  plan: ReactNode;
  section: ReactNode;
  iso: ReactNode;
  labels: { plan: string; section: string; iso: string };
}) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState<Record<VizPanelId, boolean>>({
    plan: true,
    section: false,
    iso: false,
  });
  const [fillId, setFillId] = useState<VizPanelId | null>(null);

  const toggle = (id: VizPanelId) => {
    if (fillId === id) {
      setFillId(null);
      setOpen((prev) => ({ ...prev, [id]: false }));
      return;
    }
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFill = (id: VizPanelId) => {
    if (fillId === id) {
      setFillId(null);
      return;
    }
    setOpen((o) => ({ ...o, [id]: true }));
    setFillId(id);
    requestAnimationFrame(() => {
      document
        .querySelector(".repair-viz-accordion.is-fill")
        ?.closest(".overflow-y-auto")
        ?.scrollTo({ top: 0 });
    });
  };

  const panels: { id: VizPanelId; label: string; body: ReactNode }[] = [
    { id: "plan", label: labels.plan, body: plan },
    { id: "section", label: labels.section, body: section },
    { id: "iso", label: labels.iso, body: iso },
  ];

  const isFill = fillId != null;

  return (
    <div className={`repair-viz-accordion${isFill ? " is-fill" : ""}`}>
      {panels.map((panel) => {
        if (isFill && panel.id !== fillId) return null;
        const isOpen = fillId === panel.id || open[panel.id];
        const isPanelFill = fillId === panel.id;
        return (
          <div
            key={panel.id}
            className={`repair-viz-accordion__panel${isOpen ? " is-open" : ""}${
              isPanelFill ? " is-fill" : ""
            }`}
          >
            <div className="repair-viz-accordion__bar">
              <button
                type="button"
                className="repair-viz-accordion__header"
                aria-expanded={isOpen}
                onClick={() => toggle(panel.id)}
              >
                <span className="repair-viz-accordion__title">{panel.label}</span>
              </button>
              <div className="repair-viz-accordion__trailing">
                <button
                  type="button"
                  className="repair-viz-accordion__fill-btn"
                  aria-pressed={isPanelFill}
                  aria-label={
                    isPanelFill
                      ? t("repair.viz.collapse")
                      : t("repair.viz.expand")
                  }
                  onClick={() => toggleFill(panel.id)}
                >
                  {isPanelFill ? (
                    <CollapsePanelIcon size={16} />
                  ) : (
                    <ExpandPanelIcon size={16} />
                  )}
                </button>
                <button
                  type="button"
                  className="repair-viz-accordion__chevron-btn"
                  aria-expanded={isOpen}
                  aria-label={panel.label}
                  onClick={() => toggle(panel.id)}
                >
                  <span className="repair-viz-accordion__chevron" aria-hidden>
                    {isOpen ? "▾" : "▸"}
                  </span>
                </button>
              </div>
            </div>
            {isOpen ? (
              <div className="repair-viz-accordion__body">{panel.body}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
