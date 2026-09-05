import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/useAppTheme';
import {
  Bloom,
  Gradients,
  Radius,
  Typography,
  type BloomSpec,
  type GradientName,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Size = 'cta' | 'mini' | 'fab' | 'segment';

type Props = {
  label?: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  onPress?: () => void;
  /** `neutral` resolves to the dark ramp on light mode and vice versa. */
  variant?: GradientName | 'neutral';
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  children?: React.ReactNode;
};

const SIZES: Record<Size, { height: number; font: number; icon: number; padH: number }> = {
  cta: { height: 52, font: 15, icon: 20, padH: 20 },
  mini: { height: 44, font: 14, icon: 17, padH: 18 },
  fab: { height: 56, font: 0, icon: 26, padH: 0 },
  segment: { height: 36, font: 12.5, icon: 15, padH: 10 },
};

const BLOOM: Record<Size, BloomSpec> = {
  cta: Bloom.cta,
  mini: Bloom.mini,
  fab: Bloom.fab,
  segment: Bloom.segment,
};

/**
 * The gradient ramp, drawn with react-native-svg.
 *
 * `expo-linear-gradient` would be the conventional choice, but it could not be
 * installed in this environment; react-native-svg is already a dependency (the
 * donut chart uses it) and renders a true multi-stop gradient, so it carries
 * the material with no new package. Swapping to expo-linear-gradient later is
 * a change to this component alone.
 */
function Ramp({
  colors,
  locations = [0, 0.52, 1],
}: {
  colors: readonly string[];
  locations?: number[];
}) {
  const id = React.useId().replace(/:/g, '');
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        {/* 120° — the ramp is deliberately not plumb. */}
        <LinearGradient id={id} x1="0%" y1="0%" x2="85%" y2="100%">
          {colors.map((c, i) => (
            <Stop key={i} offset={`${(locations[i] ?? i / (colors.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** The sheen over the top of a pill. Barely there, on purpose. */
function Sheen({ strong }: { strong?: boolean }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={strong ? 0.28 : 0.06} />
          <Stop offset="55%" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * The primary material — a gradient pill.
 *
 * Four layers, per DESIGN.md § Components: a 120° gradient ramp, a same-hue
 * bloom, a faint top sheen, and a compressing overlay while pressed. The radius
 * is always half the height, at every size, so a 44px secondary button and a
 * 52px CTA are the same shape at different scales.
 *
 * A disabled button drops the gradient AND the bloom entirely — a disabled
 * control must never glow, which is the clearest single signal in the system.
 */
export function GradientButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  size = 'cta',
  disabled,
  loading,
  style,
  labelStyle,
  accessibilityLabel,
  children,
}: Props) {
  const theme = useAppTheme();
  const isDark = useColorScheme() === 'dark';
  const dims = SIZES[size];
  const bloom = BLOOM[size];

  const rampName: GradientName =
    variant === 'neutral' ? (isDark ? 'neutralLight' : 'neutralDark') : variant;
  const ramp = Gradients[rampName];
  const isLightRamp = rampName === 'neutralLight';

  const press = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withTiming(press.value * 1.5, { duration: press.value ? 120 : 180 }) },
      { scale: withTiming(1 - press.value * 0.012, { duration: press.value ? 120 : 180 }) },
    ],
  }));
  const dimStyle = useAnimatedStyle(() => ({
    opacity: withTiming(press.value * 0.16, { duration: press.value ? 120 : 180 }),
  }));

  const radius = dims.height / 2;
  const isDisabled = disabled || loading;

  const body = children ?? (
    <View style={styles.row}>
      {icon ? (
        <MaterialIcons
          name={icon}
          size={dims.icon}
          color={isDisabled ? theme.textTertiary : ramp.on}
        />
      ) : null}
      {label ? (
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            { fontSize: dims.font, color: isDisabled ? theme.textTertiary : ramp.on },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );

  // Disabled: flat track fill, no gradient, no bloom, no shadow.
  if (isDisabled) {
    return (
      <View
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel={accessibilityLabel ?? label}
        style={[
          styles.base,
          {
            height: dims.height,
            borderRadius: radius,
            paddingHorizontal: dims.padH,
            backgroundColor: theme.segmentTrackBg,
            width: size === 'fab' ? dims.height : undefined,
          },
          style,
        ]}
      >
        {loading ? <ActivityIndicator color={theme.textTertiary} /> : body}
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        {
          borderRadius: radius,
          // The bloom. iOS renders shadowColor directly; Android honours it from
          // API 28 and falls back to a neutral elevation shadow below that.
          shadowColor: ramp.mid,
          shadowOpacity: bloom.opacity,
          shadowRadius: bloom.radius,
          shadowOffset: { width: 0, height: bloom.offsetY },
          elevation: bloom.elevation,
        },
        animStyle,
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        onPressIn={() => {
          press.value = 1;
        }}
        onPressOut={() => {
          press.value = 0;
        }}
        style={[
          styles.base,
          {
            height: dims.height,
            borderRadius: radius,
            paddingHorizontal: dims.padH,
            width: size === 'fab' ? dims.height : undefined,
            overflow: 'hidden',
          },
        ]}
      >
        <Ramp colors={ramp.colors} />
        <Sheen strong={isLightRamp} />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dimStyle]}
        />
        {body}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    ...Typography.bodySemibold,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});

/** Flat gradient fill with no press behaviour — for the segmented indicator. */
export function GradientFill({
  variant = 'primary',
  radius = Radius.md,
  style,
}: {
  variant?: GradientName;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const ramp = Gradients[variant];
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <Ramp colors={ramp.colors} />
    </View>
  );
}
