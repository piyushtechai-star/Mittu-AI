// Onboarding 2/2, Meet Mittu & mic permission (meeting brief 2026-11-17): Mittu hops onto his golden perch, chirps
// "Mittu Mittu!", and asks for the microphone so the user can talk to him. Skippable; the T&C line is implicit.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Sparkles } from '@/components/Art';
import { ConsentLine } from '@/components/Consent';
import { Mittu } from '@/components/Mittu';
import { Perch } from '@/components/Scene';
import { Button, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { entryFor, setOnboarded } from '@/lib/nav';
import { chirp, initSound } from '@/lib/sound';
import { requestMic, voiceSupported } from '@/lib/voice';
import { colors, fonts, scene, space, type } from '@/theme';

const S = 200;

export default function MeetMittu() {
  const { signedIn, me } = useAuth();
  const still = !!useReducedMotion();
  const [talking, setTalking] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [mic, setMic] = useState<'ask' | 'busy' | 'on' | 'off'>('ask');
  const hop = useSharedValue(still ? 0 : -70);

  useEffect(() => {
    if (!still) hop.value = withSequence(withTiming(-90, { duration: 250 }), withTiming(0, { duration: 420, easing: Easing.out(Easing.back(2)) }));
    const timers = [
      setTimeout(async () => { await initSound(); setBubble(true); setTalking(true); await chirp(); setTalking(false); }, 700),
      setTimeout(() => setBubble(false), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [still, hop]);
  const hopStyle = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }] }));

  const go = () => {
    void setOnboarded();
    router.replace(entryFor(signedIn, me?.next) as never);
  };
  const askMic = async () => {
    setMic('busy');
    setMic((await requestMic()) ? 'on' : 'off');
  };

  return (
    <Screen scroll={false} footer={
      <View>
        <Button title={mic === 'ask' && voiceSupported ? 'Abhi nahi, aage badhein' : 'Aage badhein'} iconRight="arrow-forward"
          variant={mic === 'ask' && voiceSupported ? 'secondary' : 'primary'} onPress={go} />
        <ConsentLine />
      </View>
    }>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 240, height: S + 135, alignItems: 'center' }}>
          <Perch x={120} rodY={S * 0.85} scale={1} />
          <Sparkles width={240} height={S} count={10} still={still} />
          <Animated.View style={hopStyle}>
            <Mittu size={S} turban talking={talking} still={still} />
          </Animated.View>
          {bubble ? (
            <View style={{ position: 'absolute', right: -8, top: 6, backgroundColor: '#FFF6DC', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontFamily: fonts.uiBold, color: '#3B2812', fontSize: 15 }}>Mittu Mittu! 🦜</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 33, color: scene.goldSoft, textAlign: 'center',
          textShadowColor: 'rgba(212,175,55,0.5)', textShadowRadius: 10 }}>
          Suno suno, aapka{'\n'}astrologer haazir hai!
        </Text>
        <Text style={[type.subhead, { textAlign: 'center', marginTop: space.sm, maxWidth: 310 }]}>
          Bolkar sawaal poochiye, Mittu card nikaal kar jawab sunayega. Beech mein bhi tok sakte hain!
        </Text>
        {voiceSupported ? (
          <Pressable accessibilityRole="button" onPress={mic === 'ask' || mic === 'off' ? askMic : undefined}
            style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, height: 52, borderRadius: 26,
              backgroundColor: mic === 'on' ? 'rgba(46,204,113,0.18)' : scene.saffron, borderWidth: 1, borderColor: mic === 'on' ? colors.success : scene.gold,
              boxShadow: mic === 'on' ? undefined : '0 0 22px rgba(255,153,51,0.55)' }}>
            <Ionicons name={mic === 'on' ? 'checkmark-circle' : 'mic'} size={22} color={mic === 'on' ? colors.success : '#1B1240'} />
            <Text style={{ fontFamily: fonts.uiBold, fontSize: 16, color: mic === 'on' ? colors.success : '#1B1240' }}>
              {mic === 'on' ? 'Mic chalu hai' : mic === 'busy' ? 'Ek second…' : mic === 'off' ? 'Mic dobara try karein' : 'Mic chalu karein'}
            </Text>
          </Pressable>
        ) : null}
        {mic === 'off' ? (
          <Text style={[type.footnote, { marginTop: space.sm, textAlign: 'center' }]}>Koi baat nahi, aap likh kar bhi pooch sakte hain.</Text>
        ) : null}
      </View>
    </Screen>
  );
}
