import { Platform } from 'react-native';

// Chart/legend palette shared by donut & bar charts (amber-led, matches the
// reference fintech mockups: amber is the single "hero" accent, the rest are
// muted functional/category hues).
const DARK_CHART_PALETTE = ['#F0A94A', '#F2555A', '#3AD1B0', '#3DDC84', '#7C8CF0', '#98989F'];
const LIGHT_CHART_PALETTE = ['#E8963C', '#D64550', '#2BB6A3', '#1FA463', '#6E7BE0', '#9A9AA1'];

export const LightColors = {
  background: '#F5F4F0',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#14141A',
  textSecondary: '#6B6B72',
  textTertiary: '#9A9AA1',

  // Single brand accent (amber) — used for the FAB, hero chart line/fill,
  // and the largest donut slice. NOT used for active tabs/segments — those
  // use an inverted high-contrast pill instead (see segmentActiveBg).
  primary: '#E8963C',
  primaryLight: '#FBE8CF',
  primaryMuted: 'rgba(232,150,60,0.14)',

  expense: '#D64550',
  income: '#1FA463',

  border: '#E7E4DD',
  borderLight: '#EFEDE7',

  progressGreen: '#1FA463',
  progressRed: '#D64550',

  calculator: '#FFFFFF',
  calculatorDark: '#F1EFE9',

  fab: '#E8963C',
  tabActive: '#14141A',
  tabInactive: '#9A9AA1',

  // Inverted high-contrast pill used for the active state of segmented
  // controls / pill toggles (Week·Month·Year, Expense·Income·Transfer, etc.)
  segmentTrackBg: '#EDEBE4',
  segmentActiveBg: '#14141A',
  segmentActiveText: '#FFFFFF',
  segmentInactiveText: '#6B6B72',

  chipBg: '#EDEBE4',
  chipActiveBg: '#14141A',
  chipActiveText: '#FFFFFF',
  chipText: '#3A3A40',

  chartPalette: LIGHT_CHART_PALETTE,

  white: '#FFFFFF',
  shadow: 'rgba(20,20,20,0.08)',
};

export const DarkColors = {
  background: '#0B0B0D',
  surface: '#17171B',
  surfaceElevated: '#1E1E23',
  text: '#F2F2F4',
  textSecondary: '#98989F',
  textTertiary: '#6B6B72',

  primary: '#F0A94A',
  primaryLight: '#3A2D18',
  primaryMuted: 'rgba(240,169,74,0.18)',

  expense: '#F2555A',
  income: '#3DDC84',

  border: '#26262B',
  borderLight: '#1F1F24',

  progressGreen: '#3DDC84',
  progressRed: '#F2555A',

  calculator: '#1D1D22',
  calculatorDark: '#141417',

  fab: '#F0A94A',
  tabActive: '#F2F2F4',
  tabInactive: '#6B6B72',

  segmentTrackBg: '#1B1B20',
  segmentActiveBg: '#F2F2F4',
  segmentActiveText: '#0B0B0D',
  segmentInactiveText: '#98989F',

  chipBg: '#1B1B20',
  chipActiveBg: '#F2F2F4',
  chipActiveText: '#0B0B0D',
  chipText: '#C9C9CE',

  chartPalette: DARK_CHART_PALETTE,

  white: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.5)',
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

export const Typography = {
  hero: { fontSize: 34, fontWeight: '700' as const },
  heroSm: { fontSize: 26, fontWeight: '700' as const },
  title: { fontSize: 20, fontWeight: '700' as const },
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
