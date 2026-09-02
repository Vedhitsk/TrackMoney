import { Platform } from 'react-native';

export const DarkColors = {
  // ── Core surfaces ──────────────────────────────────
  background:       '#0D0D0F',
  surface:          '#18181C',
  surfaceElevated:  '#222228',
  surfaceSubtle:    '#1C1C21',

  // ── Brand / Primary ────────────────────────────────
  primary:          '#F59E0B',
  primaryDim:       '#D97706',
  primaryMuted:     '#3D2A00',

  // ── Semantic ───────────────────────────────────────
  income:           '#00E5A0',
  expense:          '#FF5C5C',
  expenseMuted:     '#3D1515',
  warning:          '#F59E0B',
  warningMuted:     '#3D2A00',

  // ── Text ───────────────────────────────────────────
  textPrimary:      '#F0F0F2',
  textSecondary:    '#8A8A96',
  textMuted:        '#4A4A55',
  textOnPrimary:    '#001A12',

  // ── Borders ────────────────────────────────────────
  border:           '#2C2C34',
  borderFocus:      '#F59E0B',
  overlay:          'rgba(0,0,0,0.72)',
  shadow:           'rgba(0,0,0,0.6)',

  // ── Chart palette (8 stops) ────────────────────────
  chart:            ['#00E5A0','#F59E0B','#6C8EFF','#FF5C5C','#C084FC','#38BDF8','#FB923C','#A3E635'] as readonly string[],

  // ── Backward-compatible aliases (keep all existing screens compiling) ──
  text:             '#F0F0F2',   // = textPrimary
  primaryLight:     '#3D2A00',   // = primaryMuted
  borderLight:      '#2C2C34',   // = border (subtle alias)
  progressGreen:    '#00E5A0',   // = income
  progressRed:      '#FF5C5C',   // = expense
  calculator:       '#222228',   // = surfaceElevated
  calculatorDark:   '#1C1C21',   // = surfaceSubtle
  fab:              '#F59E0B',   // = primary
  tabActive:        '#F59E0B',   // = primary
  tabInactive:      '#8A8A96',   // = textSecondary
  white:            '#18181C',   // = surface (used as "inverted white" in dark mode)
};

export const LightColors = {
  // ── Core surfaces ──────────────────────────────────
  background:       '#F5F4F0',
  surface:          '#FFFFFF',
  surfaceElevated:  '#F0EFEB',
  surfaceSubtle:    '#FAFAF8',

  // ── Brand / Primary ────────────────────────────────
  primary:          '#D97706',
  primaryDim:       '#B45309',
  primaryMuted:     '#FEF3C7',

  // ── Semantic ───────────────────────────────────────
  income:           '#059669',
  expense:          '#DC2626',
  expenseMuted:     '#FEE2E2',
  warning:          '#D97706',
  warningMuted:     '#FEF3C7',

  // ── Text ───────────────────────────────────────────
  textPrimary:      '#0F172A',
  textSecondary:    '#64748B',
  textMuted:        '#CBD5E1',
  textOnPrimary:    '#FFFFFF',

  // ── Borders ────────────────────────────────────────
  border:           '#E2E8F0',
  borderFocus:      '#D97706',
  overlay:          'rgba(0,0,0,0.5)',
  shadow:           'rgba(0,0,0,0.1)',

  // ── Chart palette (8 stops) ────────────────────────
  chart:            ['#059669','#D97706','#6C8EFF','#DC2626','#C084FC','#0284C7','#EA580C','#65A30D'] as readonly string[],

  // ── Backward-compatible aliases ────────────────────
  text:             '#0F172A',   // = textPrimary
  primaryLight:     '#FEF3C7',   // = primaryMuted
  borderLight:      '#F1F5F9',   // lighter than border — disabled/subtle rule lines
  progressGreen:    '#059669',   // = income
  progressRed:      '#DC2626',   // = expense
  calculator:       '#FAFAF8',   // = surfaceSubtle
  calculatorDark:   '#F0EFEB',   // = surfaceElevated (darker in light mode)
  fab:              '#D97706',   // = primary
  tabActive:        '#D97706',   // = primary
  tabInactive:      '#94A3B8',
  white:            '#FFFFFF',   // = surface
};

export type ThemeColors = typeof LightColors;
// Compile-time assertion: DarkColors must remain structurally identical to LightColors.
// If keys ever diverge, TypeScript will error here before any screen breaks.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _darkCheck: ThemeColors = DarkColors;

export const AppColors = LightColors; // Temporary fallback

export const Colors = {
  light: {
    text:            LightColors.textPrimary,
    background:      LightColors.background,
    tint:            LightColors.primary,
    icon:            LightColors.tabInactive,
    tabIconDefault:  LightColors.tabInactive,
    tabIconSelected: LightColors.tabActive,
  },
  dark: {
    text:            DarkColors.textPrimary,
    background:      DarkColors.background,
    tint:            DarkColors.primary,
    icon:            DarkColors.tabInactive,
    tabIconDefault:  DarkColors.tabInactive,
    tabIconSelected: DarkColors.tabActive,
  },
};

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

export const Spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

export const Radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  pill: 999,
} as const;
