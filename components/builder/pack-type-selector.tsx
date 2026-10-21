"use client";

import { PACK_TYPES, type PackType } from "@/types/prompt-pack";

export function PackTypeSelector({
  value,
  onChange,
}: {
  value: PackType;
  onChange: (value: PackType) => void;
}) {
  return (
    <div className="field">
      <span className="field__label">What kind of pack?</span>
      <div className="composer__chips">
        {PACK_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            className="composer__chip"
            aria-pressed={value === type.id}
            onClick={() => onChange(type.id)}
          >
            {type.label}
          </button>
        ))}
      </div>
      <span className="field__hint">{PACK_TYPES.find((type) => type.id === value)?.description}</span>
    </div>
  );
}
