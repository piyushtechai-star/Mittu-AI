// 2. Meet Mittu (storyboard): Mittu in his red pagdi on the perch greets the user, then → phone login.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Sparkles } from '@/components/Art';
import { Mittu } from '@/components/Mittu';
import { Perch } from '@/components/Scene';
import { Button, Screen } from '@/components/ui';
import { initSound, play } from '@/lib/sound';
import { scene, serif, space, type } from '@/theme';

const S = 210;

export default function MeetMittu() {
  const still = !!useReducedMotion();
  const [talking, setTalking] = useState(false);
  useEffect(() => {
    const timers = [
      setTimeout(async () => { await initSound(); play('squawk', 0.8); setTalking(true); }, 450),
      setTimeout(() => setTalking(false), 1500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <Screen scroll={false} footer={<Button title="Aage badhein" iconRight="arrow-forward" onPress={() => router.push('/auth/phone')} />}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 240, height: S + 120, alignItems: 'center' }}>
          <Perch x={120} rodY={S * 0.85} scale={1} />
          <Sparkles width={240} height={S} count={10} still={still} />
          <Mittu size={S} turban talking={talking} still={still} />
        </View>
        <Text style={{ fontFamily: serif, fontWeight: '700', fontSize: 25, lineHeight: 34, color: scene.goldSoft, textAlign: 'center',
          marginTop: space.xl, textShadowColor: 'rgba(212,175,55,0.5)', textShadowRadius: 10 }}>
          Suno suno, aapka{'\n'}astrologer haazir hai!
        </Text>
        <Text style={[type.subhead, { textAlign: 'center', marginTop: space.md, maxWidth: 300 }]}>
          Apna sawaal poochiye. Mittu tarot card nikaal kar aapka bhavishya sunayega.
        </Text>
      </View>
    </Screen>
  );
}
