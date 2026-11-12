import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarField } from '@/components/Scene';
import { colors, glow, radius, shadow, space, type } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
const MAX = 560; // readable column on a tablet or desktop browser; no effect on phones

/** A standard screen. `footer` sits above the Android navigation bar (safe-area bottom inset, guide 11). */
export function Screen({ children, scroll = true, footer, padded = true }: {
  children: ReactNode; scroll?: boolean; footer?: ReactNode; padded?: boolean;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', ...(footer ? [] : ['bottom' as const])]}>
      <StarField />
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.column, padded && styles.padded, { paddingBottom: space.xxl }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, styles.column, padded && styles.padded]}>{children}</View>
      )}
      {footer ? <SafeAreaView edges={['bottom']} style={[styles.footer, styles.column]}>{footer}</SafeAreaView> : null}
    </SafeAreaView>
  );
}

export function Header({ title, back = true, right }: { title?: string; back?: boolean; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => router.back()} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={26} color={colors.accent} />
        </Pressable>
      ) : <View style={styles.headerSide} />}
      <Text style={[type.headline, { flex: 1, textAlign: 'center', fontSize: 17 }]} numberOfLines={1}>{title}</Text>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function Title({ children, sub, center }: { children: ReactNode; sub?: string; center?: boolean }) {
  const align = center ? { textAlign: 'center' as const } : null;
  return (
    <View style={{ marginBottom: space.lg, gap: space.sm }}>
      <Text style={[type.largeTitle, align]}>{children}</Text>
      {sub ? <Text style={[type.callout, { color: colors.textSecondary }, align]}>{sub}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Primary = the storyboard's glowing gold-outlined pill; secondary = soft gold; ghost = text only. */
export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, iconRight }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; icon?: IconName; iconRight?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const primary = variant === 'primary';
  const fg = primary ? scenePale : colors.accent;
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ disabled: disabled || loading }} disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [styles.button, primary ? styles.primary : variant === 'secondary' ? { backgroundColor: colors.accentSoft } : null,
        (disabled || pressed) && { opacity: disabled ? 0.4 : 0.8 }]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[type.headline, { color: fg }]}>{title}</Text>
          {iconRight ? <Ionicons name={iconRight} size={18} color={fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}
const scenePale = '#F3DC8A';

export function Row({ title, subtitle, icon, onPress, right }: {
  title: string; subtitle?: string; icon?: IconName; onPress?: () => void; right?: ReactNode;
}) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
      {icon ? <Ionicons name={icon} size={21} color={colors.accent} style={{ width: 26 }} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.headline}>{title}</Text>
        {subtitle ? <Text style={type.subhead} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null)}
    </Pressable>
  );
}

export function Group({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <View style={{ gap: space.sm, marginBottom: space.lg }}>
      {title ? <Text style={[type.footnote, { textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: space.xs }]}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: space.xs }}>
      {props.label ? <Text style={type.subhead}>{props.label}</Text> : null}
      <TextInput placeholderTextColor={colors.textTertiary} {...props} style={[styles.field, props.style]} />
    </View>
  );
}

export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)}
      style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.sm }}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? colors.accent : colors.textTertiary} />
      <Text style={[type.subhead, { flex: 1, color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

/** Pill chips. With `color`, each option is its own colour (the storyboard's category chips). */
export function Chips<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; color?: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map((o) => {
        const on = o.value === value;
        const c = o.color ?? colors.accent;
        return (
          <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={[styles.chip, { backgroundColor: o.color ? c + (on ? 'FF' : '73') : on ? c : colors.card, borderColor: on ? '#F3DC8A' : o.color ? c : colors.border },
              on && { borderWidth: 2, ...glow }]}>
            <Text style={[type.subhead, { color: on && !o.color ? colors.onAccent : '#FFFFFF', fontWeight: '600' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ padding: space.xxl, alignItems: 'center', gap: space.md }}>
      <ActivityIndicator color={colors.accent} />
      {label ? <Text style={[type.subhead, { textAlign: 'center' }]}>{label}</Text> : null}
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <View style={{ padding: space.xl, alignItems: 'center', gap: space.md }}>
      <Text style={[type.callout, { textAlign: 'center', color: colors.textSecondary }]}>{message ?? 'Something went wrong. Please try again.'}</Text>
      <Button title="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  primary: { backgroundColor: 'rgba(27,18,64,0.9)', borderWidth: 1.5, borderColor: colors.accent, ...glow },
  column: { width: '100%', maxWidth: MAX, alignSelf: 'center' },
  padded: { paddingHorizontal: space.lg, paddingTop: space.sm },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', height: 48, marginBottom: space.sm },
  headerSide: { width: 56, justifyContent: 'center' },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm, backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadow },
  button: { height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 54 },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden' },
  field: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: space.lg, fontSize: 17, color: colors.text },
  chip: { paddingHorizontal: space.lg, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
});
