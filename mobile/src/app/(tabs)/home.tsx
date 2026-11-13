// 3. Input Sawaal (storyboard): question (typed or spoken) + coloured categories → 4. Let's Go screen.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Switch, Text, useWindowDimensions, View } from 'react-native';

import type { Category } from '@/api/mittu';
import { Mittu } from '@/components/Mittu';
import { CATEGORIES } from '@/data/categories';
import { Perch } from '@/components/Scene';
import { Button, Card, Chips, Field, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { chooseQuestion, getSkipAnimation, setSkipAnimation } from '@/lib/nav';
import { initSound, isMusicOn, pauseMusic, setMusic } from '@/lib/sound';
import { listen, voiceSupported } from '@/lib/voice';
import { colors, scene, serif, space, type } from '@/theme';

export default function Home() {
  const { me, refresh } = useAuth();
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [skip, setSkip] = useState(false);
  const [music, setMusicState] = useState(true);
  const [listening, setListening] = useState(false);
  const stopListening = useRef<(() => void) | null>(null);

  useEffect(() => {
    void initSound().then(() => setMusicState(isMusicOn()));   // preload while the user types
    getSkipAnimation().then(setSkip);
    return () => stopListening.current?.();
  }, []);

  // Speak your question: the words appear in the box as you talk; the music pauses meanwhile. Only text is kept.
  const toggleMic = () => {
    if (listening) {
      stopListening.current?.();
      return;
    }
    const before = question.trim();
    setListening(true);
    pauseMusic(true);
    stopListening.current = listen((said) => setQuestion(before ? `${before} ${said}` : said), () => {
      stopListening.current = null;
      setListening(false);
      pauseMusic(false);
    });
  };
  // Back from a reading: today's count changed.
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  // Short phones: a smaller Mittu so the question box and the button fit above the tab bar.
  const small = useWindowDimensions().height < 720;
  const left = me?.readingsLeftToday ?? 0;
  const first = me?.name?.split(' ')[0];

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: space.sm }}>
        <View style={{ width: 160, height: small ? 150 : 205, alignItems: 'center' }}>
          <Perch x={80} rodY={small ? 86 : 118} scale={small ? 0.46 : 0.62} />
          <Mittu size={small ? 100 : 138} turban />
        </View>
        <Text style={[type.largeTitle, { marginTop: space.sm, textAlign: 'center', fontFamily: serif, color: scene.goldSoft }]}>{first ? `Namaste, ${first}` : 'Namaste'}</Text>
        <Text style={[type.callout, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>Mittu bataega aapka bhavishya 🦜</Text>
      </View>

      <Card style={{ marginTop: space.xl, gap: space.md }}>
        <Text style={{ fontFamily: serif, fontSize: 18, fontWeight: '700', color: scene.goldSoft }}>Question & Categories</Text>
        <View>
          <Field value={question} onChangeText={setQuestion} multiline maxLength={300}
            placeholder={listening ? 'Boliye… Mittu sun raha hai 🦜' : voiceSupported ? 'Apna sawaal poochiye... ya mic dabaiye' : 'Apna sawaal poochiye...'}
            style={{ minHeight: 84, paddingTop: 14, textAlignVertical: 'top', paddingRight: voiceSupported ? 56 : undefined }} />
          {voiceSupported ? (
            <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : 'Speak your question'}
              accessibilityState={{ selected: listening }} hitSlop={6} onPress={toggleMic}
              style={{ position: 'absolute', right: 10, bottom: 10, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                backgroundColor: listening ? '#C93A3A' : colors.accentSoft, borderWidth: 1, borderColor: listening ? '#FF8A8A' : colors.border }}>
              <Ionicons name={listening ? 'stop' : 'mic'} size={20} color={listening ? '#FFFFFF' : scene.goldSoft} />
            </Pressable>
          ) : null}
        </View>
        <Chips options={CATEGORIES} value={category} onChange={setCategory} />
      </Card>

      <View style={{ marginTop: space.xl, gap: space.sm }}>
        <Button title="Aage badhein" iconRight="arrow-forward" disabled={left <= 0} onPress={() => chooseQuestion(question.trim(), category)} />
        <Text style={[type.footnote, { textAlign: 'center' }]}>
          {left > 0 ? `Aaj ${left} reading${left === 1 ? '' : 's'} baaki` : 'Aaj ki readings ho gayin. Kal phir aaiye!'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.xl, gap: space.md }}>
        <Text style={[type.subhead, { flex: 1, color: colors.text }]}>Background music</Text>
        <Switch value={music} onValueChange={(v) => { setMusicState(v); setMusic(v); }}
          trackColor={{ true: colors.accent, false: colors.border }} thumbColor={music ? scene.goldSoft : '#BDB5A6'} activeThumbColor={scene.goldSoft} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.md, gap: space.md }}>
        <Text style={[type.subhead, { flex: 1, color: colors.text }]}>Skip animation</Text>
        <Switch value={skip} onValueChange={(v) => { setSkip(v); void setSkipAnimation(v); }}
          trackColor={{ true: colors.accent, false: colors.border }} thumbColor={skip ? scene.goldSoft : '#BDB5A6'} activeThumbColor={scene.goldSoft} />
      </View>
      <Text style={[type.footnote, { textAlign: 'center', marginTop: space.xl }]}>Sirf manoranjan ke liye</Text>
    </Screen>
  );
}
