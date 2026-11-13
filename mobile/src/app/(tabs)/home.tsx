// 3. Input Sawaal (storyboard): question + coloured categories → 4. Let's Go screen.
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import type { Category } from '@/api/mittu';
import { Mittu } from '@/components/Mittu';
import { CATEGORIES } from '@/data/categories';
import { Perch } from '@/components/Scene';
import { Button, Card, Chips, Field, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { chooseQuestion, getSkipAnimation, setSkipAnimation } from '@/lib/nav';
import { initSound } from '@/lib/sound';
import { colors, scene, serif, space, type } from '@/theme';

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
      <View style={{ alignItems: 'center', marginTop: space.sm }}>
        <View style={{ width: 160, height: 205, alignItems: 'center' }}>
          <Perch x={80} rodY={118} scale={0.62} />
          <Mittu size={138} turban />
        </View>
        <Text style={[type.largeTitle, { marginTop: space.sm, textAlign: 'center', fontFamily: serif, color: scene.goldSoft }]}>{first ? `Namaste, ${first}` : 'Namaste'}</Text>
        <Text style={[type.callout, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>Mittu bataega aapka bhavishya 🦜</Text>
      </View>

      <Card style={{ marginTop: space.xl, gap: space.md }}>
        <Text style={{ fontFamily: serif, fontSize: 18, fontWeight: '700', color: scene.goldSoft }}>Question & Categories</Text>
        <Field value={question} onChangeText={setQuestion} placeholder="Apna sawaal poochiye..." multiline maxLength={300}
          style={{ minHeight: 84, paddingTop: 14, textAlignVertical: 'top' }} />
        <Chips options={CATEGORIES} value={category} onChange={setCategory} />
      </Card>

      <View style={{ marginTop: space.xl, gap: space.sm }}>
        <Button title="Aage badhein" iconRight="arrow-forward" disabled={left <= 0} onPress={() => chooseQuestion(question.trim(), category)} />
        <Text style={[type.footnote, { textAlign: 'center' }]}>
          {left > 0 ? `Aaj ${left} reading${left === 1 ? '' : 's'} baaki` : 'Aaj ki readings ho gayin. Kal phir aaiye!'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.xl, gap: space.md }}>
        <Text style={[type.subhead, { flex: 1, color: colors.text }]}>Skip animation</Text>
        <Switch value={skip} onValueChange={(v) => { setSkip(v); void setSkipAnimation(v); }}
          trackColor={{ true: colors.accent, false: colors.border }} thumbColor={skip ? scene.goldSoft : '#BDB5A6'} />
      </View>
      <Text style={[type.footnote, { textAlign: 'center', marginTop: space.xl }]}>Sirf manoranjan ke liye</Text>
    </Screen>
  );
}
