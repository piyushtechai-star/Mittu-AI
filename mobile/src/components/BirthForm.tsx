// Birth details form (adapted from Naksh's BirthForm): used by onboarding (birth.tsx) and Profile > Birth details.
// Date and time are typed (DD / MM / YYYY, HH:MM + AM/PM) so it works the same on Android, iOS and web without native
// pickers. Unlike Naksh, the place is a typed city name (no map search): Mittu only uses it as a personal touch.
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Birth, BirthInput } from '@/api/mittu';
import { Check, Chips, type IconName } from '@/components/ui';
import { colors, radius, scene, shadow, space, type } from '@/theme';

export type BirthValue = {
  date: string;          // typed digits DDMMYYYY
  time: string;          // typed digits HHMM (12-hour)
  pm: boolean;
  timeKnown: boolean;
  place: string;
  gender: 'female' | 'male' | 'other' | '';
};

export const emptyBirth: BirthValue = { date: '', time: '', pm: false, timeKnown: true, place: '', gender: '' };

const pad = (n: number) => String(n).padStart(2, '0');
const digits = (s: string, n: number) => s.replace(/\D/g, '').slice(0, n);
/** "12102004" -> "12 / 10 / 2004", growing as the user types. */
const dateText = (d: string) => [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join(' / ');
/** "1024" -> "10:24". */
const timeText = (d: string) => (d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2, 4)}` : d);

/** A saved profile back into the form (for editing). */
export function birthToValue(b: Birth | null): BirthValue {
  if (!b) return emptyBirth;
  const [y, m, d] = b.birthDate.split('-');
  let time = '', pm = false;
  if (b.birthTime) {
    const [hh, mm] = b.birthTime.split(':').map(Number);
    pm = hh >= 12;
    time = pad(hh % 12 || 12) + pad(mm);
  }
  return { date: d + m + y, time, pm, timeKnown: !!b.birthTime, place: b.birthPlace ?? '', gender: b.gender ?? '' };
}

/** Validates and converts to the API shape, or returns a message to show. The server checks the same rules. */
export function toBirthInput(v: BirthValue): { ok: true; value: BirthInput } | { ok: false; error: string } {
  if (v.date.length !== 8) return { ok: false, error: 'Janam tithi poori likhiye (DD / MM / YYYY).' };
  const day = Number(v.date.slice(0, 2)), month = Number(v.date.slice(2, 4)), year = Number(v.date.slice(4, 8));
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || dt.getUTCDate() !== day || dt.getUTCMonth() !== month - 1 || dt.getTime() > Date.now()) {
    return { ok: false, error: 'Janam tithi sahi nahi hai.' };
  }
  const now = new Date();
  const age = now.getFullYear() - year - (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day) ? 1 : 0);
  if (age < 18) return { ok: false, error: 'Mittu AI sirf 18 saal ya usse bade logon ke liye hai.' };
  let birthTime: string | null = null;
  if (v.timeKnown) {
    if (v.time.length !== 4) return { ok: false, error: 'Janam ka samay poora likhiye (HH:MM), ya "Samay nahi pata" chuniye.' };
    const h = Number(v.time.slice(0, 2)), m = Number(v.time.slice(2, 4));
    if (h < 1 || h > 12 || m > 59) return { ok: false, error: 'Janam ka samay sahi nahi hai.' };
    birthTime = `${pad(v.pm ? (h % 12) + 12 : h % 12)}:${pad(m)}`;
  }
  const place = v.place.replace(/\s+/g, ' ').trim();
  return { ok: true, value: {
    birthDate: `${year}-${pad(month)}-${pad(day)}`, birthTime, birthPlace: place || null, gender: v.gender || null,
  } };
}

/** A card as in Naksh: small label, the value in bold, an icon on the right. */
function FieldCard({ label, icon, children }: { label: string; icon: IconName; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.footnote, { color: scene.goldSoft }]}>{label}</Text>
        {children}
      </View>
      <Ionicons name={icon} size={22} color={colors.accent} />
    </View>
  );
}

export function BirthForm({ value, onChange }: { value: BirthValue; onChange: (v: BirthValue) => void }) {
  const set = (patch: Partial<BirthValue>) => onChange({ ...value, ...patch });
  // Remember the typed time while "Samay nahi pata" is ticked, so unticking brings it back.
  const [lastTime, setLastTime] = useState(value.time);

  return (
    <View style={{ gap: space.md }}>
      <FieldCard label="Janam tithi (Date of birth)" icon="calendar-outline">
        <TextInput value={dateText(value.date)} onChangeText={(s) => set({ date: digits(s, 8) })} placeholder="DD / MM / YYYY"
          placeholderTextColor={colors.textTertiary} keyboardType="number-pad" maxLength={14}
          accessibilityLabel="Date of birth" style={styles.value} />
      </FieldCard>

      <View>
        {value.timeKnown ? (
          <FieldCard label="Janam ka samay (Time of birth)" icon="time-outline">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <TextInput value={timeText(value.time)} onChangeText={(s) => { const t = digits(s, 4); setLastTime(t); set({ time: t }); }}
                placeholder="HH:MM" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" maxLength={5}
                accessibilityLabel="Time of birth" style={[styles.value, { flex: 1, minWidth: 0, width: 0 }]} />
              <View style={styles.ampm}>
                {(['AM', 'PM'] as const).map((k) => {
                  const on = (k === 'PM') === value.pm;
                  return (
                    <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} hitSlop={4}
                      onPress={() => set({ pm: k === 'PM' })} style={[styles.ampmItem, on && styles.ampmOn]}>
                      <Text style={[type.footnote, { fontWeight: '700', color: on ? colors.onAccent : colors.textSecondary }]}>{k}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </FieldCard>
        ) : null}
        <Check checked={!value.timeKnown} label="Samay nahi pata"
          onChange={(c) => set({ timeKnown: !c, time: c ? '' : lastTime })} />
        {!value.timeKnown ? <Text style={type.footnote}>Koi baat nahi, Mittu janam tithi se bhi bata dega.</Text> : null}
      </View>

      <FieldCard label="Janam sthaan (City of birth, optional)" icon="location-outline">
        <TextInput value={value.place} onChangeText={(s) => set({ place: s })} placeholder="Jaise: Lucknow"
          placeholderTextColor={colors.textTertiary} maxLength={60} autoCapitalize="words"
          accessibilityLabel="City of birth" style={styles.value} />
      </FieldCard>

      <View style={{ gap: space.xs, marginTop: space.xs }}>
        <Text style={[type.footnote, { color: scene.goldSoft }]}>Gender (optional)</Text>
        <Chips value={value.gender || ('none' as const)} onChange={(g) => set({ gender: g === value.gender || g === 'none' ? '' : g })}
          options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'other', label: 'Other' }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 68, paddingHorizontal: space.lg, paddingVertical: space.md,
    borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow },
  value: { fontSize: 17, fontWeight: '600', color: colors.text, padding: 0 },
  ampm: { flexDirection: 'row', borderRadius: radius.pill, backgroundColor: colors.surface, padding: 2, borderWidth: 1, borderColor: colors.border },
  ampmItem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  ampmOn: { backgroundColor: colors.accent },
});
