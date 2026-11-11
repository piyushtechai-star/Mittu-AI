import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import type { Category } from '@/api/mittu';
import { Mittu } from '@/components/Mittu';
import { Button, Card, Chips, Field, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getSkipAnimation, setSkipAnimation, startReading } from '@/lib/nav';
import { initSound } from '@/lib/sound';
import { colors, space, type } from '@/theme';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'love', label: 'Love ❤️' },
  { value: 'career', label: 'Career 💼' },
  { value: 'paisa', label: 'Paisa 💰' },
  { value: 'health', label: 'Health 🌿' },
  { value: 'general', label: 'General ✨' },
];

export default function Home() {
  const { me, refresh } = useAuth();
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    void initSound();   // preload while the user types
    getSkipAnimation().then(setSkip);
  }, []);
  // Back from a reading: today's count changed.
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const left = me?.readingsLeftToday ?? 0;
  const first = me?.name?.split(' ')[0];

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: space.md }}>
        <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Mittu size={128} />
        </View>
        <Text style={[type.largeTitle, { marginTop: space.md, textAlign: 'center' }]}>{first ? `Namaste, ${first}` : 'Namaste'}</Text>
        <Text style={[type.callout, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>Mittu bataega aapka bhavishya 🦜</Text>
      </View>

      <Card style={{ marginTop: space.xl, gap: space.md }}>
        <Field value={question} onChangeText={setQuestion} placeholder="Apna sawaal poochiye..." multiline maxLength={300}
          style={{ minHeight: 84, paddingTop: 14, textAlignVertical: 'top' }} />
        <Chips options={CATEGORIES} value={category} onChange={setCategory} />
      </Card>

      <View style={{ marginTop: space.lg, gap: space.sm }}>
        <Button title="Mittu, card nikaalo!" icon="sparkles" disabled={left <= 0} onPress={() => startReading(question.trim(), category)} />
        <Text style={[type.footnote, { textAlign: 'center' }]}>
          {left > 0 ? `Aaj ${left} reading${left === 1 ? '' : 's'} baaki` : 'Aaj ki readings ho gayin. Kal phir aaiye!'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.xl, gap: space.md }}>
        <Text style={[type.subhead, { flex: 1, color: colors.text }]}>Skip animation</Text>
        <Switch value={skip} onValueChange={(v) => { setSkip(v); void setSkipAnimation(v); }}
          trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#FFFFFF" />
      </View>
      <Text style={[type.footnote, { textAlign: 'center', marginTop: space.xl }]}>Sirf manoranjan ke liye</Text>
    </Screen>
  );
}
