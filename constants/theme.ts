import { Platform } from 'react-native';

/**
 * Design tokens — see _bmad-output/planning-artifacts/ux-designs/
 * ux-TrackMoney-2026-09-05/DESIGN.md, which this file implements.
 *
 * Two rules govern colour here, and both are load-bearing:
 *
 *  1. Brand and category are separate systems. The brand ramps are chrome only
 *     (FAB, buttons, active segment, active tab). Category colour appears only
 *     in charts, legends, icon tiles and progress bars. Every category hue is
 *     at least ΔE 45 from both brand ramps in CIE Lab — the closest is Fuchsia
 *     at ΔE 45 from primary. Reusing a brand hue as a category colour is the
 *     bug this palette exists to fix.
 *
 *  2. Surface separation is measured in perceptual L*, not WCAG contrast ratio.
 *     At near-black the +0.05 flare term in the ratio formula dominates, so any
 *     two dark greys score ~1.1:1 regardless of how different they look. The
 *     dark ladder below steps ΔL* 8.69 then 6.84, against a 6–9 target.
 */

// ---------------------------------------------------------------------------
// Category palette. Ten hues, tuned per mode, none within ΔE 45 of a brand ramp.
// ---------------------------------------------------------------------------

export type CategoryPalette = {
  fuchsia: string;
  coral: string;
  cyan: string;
  emerald: string;
  amber: string;
  teal: string;
  rose: string;
  lime: string;
  mocha: string;
  slate: string;
};

// Not `as const` — the two palettes must stay mutually assignable so
// `DarkColors: typeof LightColors` typechecks.
const LIGHT_CATEGORIES: CategoryPalette = {
  fuchsia: '#C43CA8',
  coral: '#E85D3C',
  cyan: '#0E7F9E',
  emerald: '#12A05E',
  amber: '#C87F06',
  teal: '#0D9E96',
  rose: '#E03A67',
  lime: '#7E9418',
  mocha: '#9C6A4E',
  slate: '#6E7787',
};

const DARK_CATEGORIES: CategoryPalette = {
  fuchsia: '#E85BD0',
  coral: '#FF7043',
  cyan: '#38C4E8',
  emerald: '#2FD37A',
  amber: '#FFB020',
  teal: '#14C8C0',
  rose: '#FF5C8A',
  lime: '#C6D93B',
  mocha: '#B98060',
  slate: '#8A93A5',
};

/** Chart/legend order. The last entry is always the "everything else" bucket. */
const toPalette = (c: CategoryPalette): string[] => [
  c.fuchsia, c.coral, c.cyan, c.emerald, c.amber,
  c.teal, c.rose, c.lime, c.mocha, c.slate,
];

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export const LightColors = {
  background: '#F1F2F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#14152A',
  textSecondary: '#565A72',
  // Placeholders are instructions, not hints. 5.12:1 on surface, 4.58:1 on
  // background — it has to clear both, which is why it is this dark.
  textTertiary: '#686D83',

  // Brand accent as a flat colour, for text, icons and hairlines. The gradient
  // ramps below carry every filled control.
  primary: '#4A38C4',
  primaryLight: '#E7E4FA',
  primaryMuted: 'rgba(90,71,214,0.13)',

  expense: '#CE3B49',
  income: '#0A6B3E',

  border: '#E2E4EE',
  borderLight: '#EDEEF5',

  progressGreen: '#0A6B3E',
  progressRed: '#CE3B49',

  calculator: '#FFFFFF',
  calculatorDark: '#E6E8F2',

  fab: '#5A47D6',
  tabActive: '#4A38C4',
  tabInactive: '#686D83',

  segmentTrackBg: '#E6E8F2',
  segmentActiveBg: '#5A47D6',
  segmentActiveText: '#FFFFFF',
  segmentInactiveText: '#565A72',

  chipBg: '#E6E8F2',
  chipActiveBg: '#5A47D6',
  chipActiveText: '#FFFFFF',
  chipText: '#3D4157',

  chartPalette: toPalette(LIGHT_CATEGORIES),
  categories: LIGHT_CATEGORIES,

  ringTrack: '#14152A1F',

  /** Tint for the blurred status-bar and tab-bar scrims. */
  scrim: 'rgba(241,242,249,0.72)',
  /** Backdrop behind a presented sheet. */
  sheetScrim: 'rgba(20,21,42,0.40)',

  white: '#FFFFFF',
  shadow: 'rgba(30,32,60,0.10)',
};

export const DarkColors: typeof LightColors = {
  background: '#07070D',
  surface: '#1C1C27',
  surfaceElevated: '#2A2A37',
  text: '#F1F1F7',
  textSecondary: '#ADAFC2',
  textTertiary: '#8B8FA6',

  primary: '#9E8BFA',
  primaryLight: '#2A2450',
  primaryMuted: 'rgba(158,139,250,0.18)',

  expense: '#FB7185',
  income: '#34D399',

  border: '#343445',
  borderLight: '#262633',

  progressGreen: '#34D399',
  progressRed: '#FB7185',

  calculator: '#1C1C27',
  calculatorDark: '#16161F',

  fab: '#5A47D6',
  tabActive: '#9E8BFA',
  tabInactive: '#8B8FA6',

  segmentTrackBg: '#24242F',
  segmentActiveBg: '#5A47D6',
  segmentActiveText: '#FFFFFF',
  segmentInactiveText: '#ADAFC2',

  chipBg: '#24242F',
  chipActiveBg: '#5A47D6',
  chipActiveText: '#FFFFFF',
  chipText: '#C7C9D8',

  chartPalette: toPalette(DARK_CATEGORIES),
  categories: DARK_CATEGORIES,

  ringTrack: '#F1F1F72B',

  scrim: 'rgba(7,7,13,0.72)',
  sheetScrim: 'rgba(3,3,8,0.55)',

  white: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.55)',
};

export type ThemeColors = typeof LightColors;

export const AppColors = LightColors; // Temporary fallback

export const Colors = {
  light: {
    text: LightColors.text,
    background: LightColors.background,
    tint: LightColors.primary,
    icon: LightColors.tabInactive,
    tabIconDefault: LightColors.tabInactive,
    tabIconSelected: LightColors.tabActive,
  },
  dark: {
    text: DarkColors.text,
    background: DarkColors.background,
    tint: DarkColors.primary,
    icon: DarkColors.tabInactive,
    tabIconDefault: DarkColors.tabInactive,
    tabIconSelected: DarkColors.tabActive,
  },
};

// ---------------------------------------------------------------------------
// The primary material
//
// A gradient pill: a short diagonal ramp, a same-hue bloom, and a faint sheen.
// Identical in both themes — the material is the brand, so it does not change
// when the surface under it does.
// ---------------------------------------------------------------------------

export type GradientRamp = {
  /** Three stops, light → mid → deep. Feed straight to LinearGradient. */
  colors: readonly [string, string, string];
  /** Colour of the label and glyphs sitting on the ramp. */
  on: string;
  /** Mid stop, used for the bloom and for any flat fallback. */
  mid: string;
};

export const Gradients = {
  /** Chrome that commits: FAB, Save, active segment, sheet confirm. */
  primary: {
    colors: ['#3C3596', '#5A47D6', '#7B62F7'],
    on: '#FFFFFF',
    mid: '#5A47D6',
  },
  /** Chrome that creates: New account, New category, Add budget. */
  secondary: {
    colors: ['#5B8CFF', '#4066FA', '#3448EE'],
    on: '#FFFFFF',
    mid: '#4066FA',
  },
  /** Neutral actions on the light theme. */
  neutralDark: {
    colors: ['#4A4270', '#2A2545', '#191529'],
    on: '#FFFFFF',
    mid: '#2A2545',
  },
  /** The same neutral actions on the dark theme. */
  neutralLight: {
    colors: ['#FFFFFF', '#F7F5FE', '#EDEAFA'],
    on: '#2E2A45',
    mid: '#F7F5FE',
  },
} as const satisfies Record<string, GradientRamp>;

export type GradientName = keyof typeof Gradients;

/**
 * Bloom strength per control size. The web mocks use a blurred copy of the
 * control; React Native has no equivalent, so this maps to a coloured
 * shadow on iOS and to elevation plus a gradient halo on Android.
 *
 * Values are deliberately restrained — the first pass glowed too much.
 */
export type BloomSpec = {
  radius: number;
  opacity: number;
  offsetY: number;
  elevation: number;
};

// No `as const` — the sizes must stay mutually assignable so a
// `Record<Size, BloomSpec>` lookup table typechecks.
export const Bloom = {
  fab: { radius: 12, opacity: 0.28, offsetY: 6, elevation: 10 },
  cta: { radius: 11, opacity: 0.22, offsetY: 5, elevation: 6 },
  mini: { radius: 9, opacity: 0.2, offsetY: 4, elevation: 4 },
  segment: { radius: 8, opacity: 0.18, offsetY: 3, elevation: 3 },
  pressed: { radius: 7, opacity: 0.14, offsetY: 2, elevation: 2 },
} satisfies Record<string, BloomSpec>;

// ---------------------------------------------------------------------------
// Chrome geometry
// ---------------------------------------------------------------------------

/** Tab bar height excluding the bottom safe-area inset. */
export const TAB_BAR_HEIGHT = 64;

/** Blur radius for the status-bar and tab-bar scrims. */
export const SCRIM_BLUR = 20;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Design tokens (theme-independent) --------------------------------------

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

/**
 * Icon tiles on menu rows (Manage, Settings) draw from the category palette,
 * not from the brand — same separation rule as charts. Keys are kept for the
 * existing call sites; the values are now category hues.
 */
export const IconPalette = {
  blue: LIGHT_CATEGORIES.cyan,
  purple: LIGHT_CATEGORIES.fuchsia,
  teal: LIGHT_CATEGORIES.teal,
  pink: LIGHT_CATEGORIES.rose,
  indigo: LIGHT_CATEGORIES.mocha,
  amber: LIGHT_CATEGORIES.amber,
  red: LIGHT_CATEGORIES.coral,
  slate: LIGHT_CATEGORIES.slate,
} as const;

export const Typography = {
  hero: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.6 },
  heroSm: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.4 },
  title: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySemibold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  // Uppercase tracked micro-label, e.g. "NET CASH FLOW · JULY", "CATEGORY"
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
} as const;
