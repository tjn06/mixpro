import {
  cardReadoutNameStyle,
  cardReadoutUnitStyle,
  cardReadoutValueStyle,
} from "../../presentation/entityCardStyles";
import {
  MIXER_SWIPE_ARROW_IDLE,
  mixerCardLimitFlashBg,
} from "../../presentation/mixerSwipeConfig";

export function MixerCardLimitFlash() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 rounded-xl pointer-events-none"
      style={{
        background: mixerCardLimitFlashBg(),
        zIndex: 2,
      }}
    />
  );
}

export function MixerSwipeChevronStack({
  direction,
  active,
  color,
}: {
  direction: "up" | "down";
  active: boolean;
  color: string;
}) {
  const fill = active ? color : MIXER_SWIPE_ARROW_IDLE;
  const path = direction === "up" ? "M4.5 0 L9 6 L0 6 Z" : "M4.5 6 L0 0 L9 0 Z";
  const opacities =
    direction === "up"
      ? active
        ? [1, 0.72, 0.48]
        : [0.38, 0.28, 0.2]
      : active
        ? [0.48, 0.72, 1]
        : [0.2, 0.28, 0.38];

  return (
    <div className="flex flex-col items-center gap-[2px] pointer-events-none">
      {opacities.map((opacity, i) => (
        <svg
          key={i}
          width="9"
          height="6"
          viewBox="0 0 9 6"
          fill={fill}
          style={{ opacity, transition: "opacity 0.15s ease, fill 0.15s ease" }}
          aria-hidden
        >
          <path d={path} />
        </svg>
      ))}
    </div>
  );
}

export function MixerCardReadout({
  name,
  value,
  unit,
  nameColor,
  valueColor,
  unitColor,
  centered = false,
}: {
  name: string;
  value: string;
  unit: string;
  nameColor: string;
  valueColor: string;
  unitColor: string;
  centered?: boolean;
}) {
  return (
    <div className={`flex flex-col min-w-0 ${centered ? "items-center" : "items-start"}`}>
      <span style={cardReadoutNameStyle(nameColor)}>{name}</span>
      <span className="tabular-nums" style={cardReadoutValueStyle(valueColor)}>
        {value}
      </span>
      <span style={cardReadoutUnitStyle(unitColor)}>{unit}</span>
    </div>
  );
}
