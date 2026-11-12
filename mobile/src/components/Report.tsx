// Report button on every reading (guide 06 / 11; Play AI-Generated Content policy).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { reportReading } from '@/api/mittu';
import { Button } from '@/components/ui';
import { track } from '@/lib/integrations';
import { colors, radius, space, type } from '@/theme';

const REASONS = ['Galat ya bekaar reading', 'Hurtful ya darane wali baat', 'Anuchit (inappropriate) content', 'Kuch aur'];

export function ReportSheet({ readingId, onClose }: { readingId: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setReason(null);
    setDone(false);
    setError(null);
    onClose();
  };

  async function send() {
    if (!readingId || !reason) return;
    setBusy(true);
    setError(null);
    try {
      await reportReading(readingId, reason);
      track('reading_reported', { reason });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={!!readingId} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={close}>
        <Pressable style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
          padding: space.xl, gap: space.md, paddingBottom: space.xl + insets.bottom }}>
          <Text style={type.title}>Report this reading</Text>
          {done ? (
            <>
              <Text style={type.body}>Shukriya! Our team will review it.</Text>
              <Button title="Done" onPress={close} />
            </>
          ) : (
            <>
              {REASONS.map((r) => (
                <Pressable key={r} accessibilityRole="radio" accessibilityState={{ selected: reason === r }} onPress={() => setReason(r)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
                  <Ionicons name={reason === r ? 'radio-button-on' : 'radio-button-off'} size={22} color={reason === r ? colors.accent : colors.textTertiary} />
                  <Text style={type.body}>{r}</Text>
                </Pressable>
              ))}
              {error ? <Text style={[type.subhead, { color: colors.danger }]}>{error}</Text> : null}
              <Button title="Report" onPress={send} loading={busy} disabled={!reason} />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** "Sirf manoranjan ke liye" + Report, shown under every reading (guide 06 rule). */
export function ReadingFooter({ onReport, color }: { onReport: () => void; color?: string }) {
  const c = color ?? colors.textSecondary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.md }}>
      <Text style={[type.footnote, { flex: 1, color: c }]}>Sirf manoranjan ke liye 🦜</Text>
      <Pressable accessibilityRole="button" hitSlop={10} onPress={onReport} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name="flag-outline" size={14} color={c} />
        <Text style={[type.footnote, { color: c }]}>Report</Text>
      </Pressable>
    </View>
  );
}
