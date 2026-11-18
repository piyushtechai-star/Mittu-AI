import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { getReading, getReadings, type HistoryItem } from '@/api/mittu';
import { ReadingFooter, ReportSheet } from '@/components/Report';
import { Card, ErrorView, Header, Loading, Screen } from '@/components/ui';
import { prettyDate } from '@/lib/format';
import { initSound, loadVoice, stopVoice } from '@/lib/sound';
import { useLoad } from '@/lib/useLoad';
import { colors, space, type } from '@/theme';

const CAT: Record<string, string> = { love: 'Love', career: 'Career', paisa: 'Paisa', health: 'Health', general: 'General' };

// Past readings (guide 06): text always; the voice only while the clip still exists (7 days).
export default function History() {
  const { data, error, reload } = useLoad(getReadings, []);
  const [reportId, setReportId] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function listen(item: HistoryItem) {
    if (playing === item.id) {
      stopVoice();
      setPlaying(null);
      return;
    }
    setLoading(item.id);
    try {
      const r = await getReading(item.id);
      if (r.audio_url) {
        await initSound();
        const clip = await loadVoice(r.audio_url);
        clip.play(() => {}, () => { clip.stop(); setPlaying((p) => (p === item.id ? null : p)); });
        setPlaying(item.id);
      }
    } catch {} finally {
      setLoading(null);
    }
  }

  return (
    <Screen>
      <Header title="Reading history" back={false} />
      {error ? <ErrorView onRetry={reload} /> : !data ? <Loading /> : data.length === 0 ? (
        <Text style={[type.subhead, { textAlign: 'center', marginTop: space.xl }]}>Abhi tak koi reading nahi. Mittu se poochiye!</Text>
      ) : (
        <View style={{ gap: space.md }}>
          {data.map((r) => (
            <Card key={r.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={type.headline}>{r.card.name} — {r.card.hindi}{r.orientation === 'reversed' ? ' (Ulta)' : ''}</Text>
                  <Text style={type.footnote}>{CAT[r.category]} · {prettyDate(r.created_at)}</Text>
                </View>
                {r.has_audio ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Listen" hitSlop={10} onPress={() => listen(r)}>
                    {loading === r.id ? <ActivityIndicator color={colors.accent} />
                      : <Ionicons name={playing === r.id ? 'stop-circle' : 'play-circle'} size={30} color={colors.accent} />}
                  </Pressable>
                ) : null}
              </View>
              {r.question ? <Text style={[type.subhead, { fontStyle: 'italic' }]}>“{r.question}”</Text> : null}
              <Text style={type.callout}>{r.text}</Text>
              {(r.followups ?? []).map((f, i) => (
                <View key={i} style={{ marginTop: space.sm, paddingLeft: space.md, borderLeftWidth: 2, borderLeftColor: colors.border, gap: 2 }}>
                  <Text style={[type.subhead, { fontStyle: 'italic' }]}>“{f.question}”</Text>
                  <Text style={type.callout}>{f.text}</Text>
                </View>
              ))}
              <ReadingFooter onReport={() => setReportId(r.id)} />
            </Card>
          ))}
        </View>
      )}
      <ReportSheet readingId={reportId} onClose={() => setReportId(null)} />
    </Screen>
  );
}
