export interface ApplePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  family: "iphone" | "ipad";
  advanced?: boolean;
}

/** Key order = default UI ordering in the generator. Sizes match App Store Connect screenshot specs. */
export const APPLE_PRESETS: Record<string, ApplePreset> = {
  iphone_65: {
    id: "iphone_65",
    label: 'iPhone 6.5"',
    width: 1284,
    height: 2778,
    family: "iphone",
  },
  iphone_67: {
    id: "iphone_67",
    label: 'iPhone 6.7"',
    width: 1290,
    height: 2796,
    family: "iphone",
  },
  iphone_65_legacy: {
    id: "iphone_65_legacy",
    label: 'iPhone 6.5" (1242×2688)',
    width: 1242,
    height: 2688,
    family: "iphone",
    advanced: true,
  },
  ipad_13: {
    id: "ipad_13",
    label: 'iPad 13"',
    width: 2064,
    height: 2752,
    family: "ipad",
  },
  ipad_11: {
    id: "ipad_11",
    label: 'iPad 11"',
    width: 1668,
    height: 2388,
    family: "ipad",
  },
  ipad_129: {
    id: "ipad_129",
    label: 'iPad 12.9" (legacy)',
    width: 2048,
    height: 2732,
    family: "ipad",
    advanced: true,
  },
} as const;

export function getPreset(id: string): ApplePreset | undefined {
  return APPLE_PRESETS[id];
}

export function getDefaultPresets(): ApplePreset[] {
  return Object.values(APPLE_PRESETS).filter((p) => !p.advanced);
}

/** CSS `aspect-ratio` value for portrait App Store dimensions (matches framed output). */
export function cssAspectRatioForPreset(presetId: string): string {
  const p = APPLE_PRESETS[presetId];
  if (!p) return "9 / 19.5";
  return `${p.width} / ${p.height}`;
}
