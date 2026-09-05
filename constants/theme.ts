import { Platform } from 'react-native';

// Chart/legend palette shared by donut & bar charts (rich violet-led,
// matches the fintech reference mockups' single "hero" accent, the rest are
// muted functional/category hues).
const DARK_CHART_PALETTE = ['#9D6FFF', '#F2555A', '#3AD1B0', '#3DDC84', '#F0A94A', '#98989F'];
const LIGHT_CHART_PALETTE = ['#7C3AED', '#D64550', '#2BB6A3', '#1FA463', '#D6811F', '#9A9AA1'];

export const LightColors = {
  background: '#F5F4F0',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#14141A',
  textSecondary: '#6B6B72',
  textTertiary: '#9A9AA1',

  // Single brand accent (rich violet-purple) — used for the FAB, hero chart
  // line/fill, and the largest donut slice. NOT used for active tabs/segments
  // — those use an inverted high-contrast pill instead (see segmentActiveBg).
  primary: '#7C3AED',
  primaryLight: '#EDE4FB',
  primaryMuted: 'rgba(124,58,237,0.14)',

  expense: '#D64550',
  income: '#1FA463',

  border: '#E7E4DD',
  borderLight: '#EFEDE7',

  progressGreen: '#1FA463',
  progressRed: '#D64550',

  calculator: '#FFFFFF',
  calculatorDark: '#F1EFE9',

  fab: '#7C3AED',
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

  // Contrasting "unfilled" track color for partial-ring / two-tone donut
  // charts — a translucent version of `text`, so it's always visible against
  // `surface`/`surfaceElevated` regardless of theme.
  ringTrack: '#14141A1F',

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

  primary: '#9D6FFF',
  primaryLight: '#2A1F42',
  primaryMuted: 'rgba(157,111,255,0.2)',

  expense: '#F2555A',
  income: '#3DDC84',

  border: '#26262B',
  borderLight: '#1F1F24',

  progressGreen: '#3DDC84',
  progressRed: '#F2555A',

  calculator: '#1D1D22',
  calculatorDark: '#141417',

  fab: '#9D6FFF',
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

  ringTrack: '#F2F2F42B',

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

/** Curated multi-color set for menu-row icon tiles (Settings, Manage, etc.) —
 * modern, muted jewel tones, distinguishable from each other and from the
 * single amber brand accent. Same hues in both themes. */
export const IconPalette = {
  blue: '#4C7EF3',
  purple: '#8B5CF6',
  teal: '#14B8A6',
  pink: '#EC4899',
  indigo: '#6366F1',
  amber: '#D6811F',
  red: '#EF4444',
  slate: '#64748B',
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
