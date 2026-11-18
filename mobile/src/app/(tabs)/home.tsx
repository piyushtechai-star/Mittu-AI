// Home, the hero stage (meeting brief 2026-11-17): voice-first. Mittu on his royal perch (breathing, head tilts,
// blinks, an occasional "Mittu Mittu!" bubble) in front of a faint turning mandala and gold dust; a thumb-friendly dock
// with category pills, a big glowing mic (waveform rings follow your voice) beside a keyboard toggle, and
// "Mittu, Card Nikaalo!" with a Quick Draw toggle. Tapping it starts the server work at once (lib/nav startReading).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Switch, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { getReading, getReadings, type Category } from '@/api/mittu';
import { Sparkles } from '@/components/Art';
import { MicButton } from '@/components/MicButton';
import { Mittu } from '@/components/Mittu';
import { Perch } from '@/components/Scene';
import { Button, Chips, Field, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { mandalaMarkup } from '@/data/cardArt';
import { CATEGORIES } from '@/data/categories';
import { getSkipAnimation, setSkipAnimation, startReading } from '@/lib/nav';
import { initSound, isMuted, loadVoice, onMuteChange, setMuted, stopVoice } from '@/lib/sound';
import { listen, voiceSupported } from '@/lib/voice';
import { colors, fonts, glass, scene, space, type } from '@/theme';

const MANDALA = mandalaMarkup();
// react-native-web's Switch colours its thumb with activeThumbColor (not in the native typings).
const WEB_THUMB = { activeThumbColor: scene.goldSoft } as object;

export default function Home() {
  const { me, refresh } = useAuth();
  const still = !!useReducedMotion();
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [typing, setTyping] = useState(!voiceSupported);
  const [quick, setQuick] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [listening, setListening] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const level = useSharedValue(0);
  const stopListening = useRef<(() => void) | null>(null);

  useEffect(() => {
    void initSound().then(() => setMutedState(isMuted()));
    getSkipAnimation().then(setQuick);
    const off = onMuteChange(setMutedState);
    // "Mittu Mittu!" speech bubble now and then (no sound: Home stays quiet)
    const t = setInterval(() => { setBubble(true); setTimeout(() => setBubble(false), 2200); }, 9000);
    return () => { off(); clearInterval(t); stopListening.current?.(); stopVoice(); };
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));   // back from a reading: today's count changed

  const toggleMic = () => {
    if (listening) {
      stopListening.current?.();
      return;
    }
    stopVoice();
    const before = question.trim();
    setListening(true);
    stopListening.current = listen((said) => setQuestion(before ? `${before} ${said}` : said), () => {
      stopListening.current = null;
      setListening(false);
      level.value = withTiming(0, { duration: 200 });
    }, (l) => { level.value = withTiming(l, { duration: 90 }); });
  };

  // Replay icon: Mittu's voice from the latest reading that still has its clip (7 days).
  const replayLast = async () => {
    if (replaying) { stopVoice(); setReplaying(false); return; }
    setReplaying(true);
    try {
      const last = (await getReadings()).find((r) => r.has_audio);
      const url = last ? (await getReading(last.id)).audio_url : null;
      if (!url) { setReplaying(false); return; }
      const clip = await loadVoice(url);
      clip.play(() => {}, () => { clip.stop(); setReplaying(false); });
    } catch { setReplaying(false); }
  };

  const go = () => {
    stopListening.current?.();
    stopVoice();
    startReading(question.trim(), category);
  };

  const { width, height } = useWindowDimensions();
  const small = height < 740;
  const S = small ? 112 : 140;
  const left = me?.readingsLeftToday ?? 0;
  const first = me?.name?.split(' ')[0];
  const spin = useSharedValue(0);
  useEffect(() => {
    if (!still) spin.value = withRepeat(withTiming(360, { duration: 120_000, easing: Easing.linear }), -1);
  }, [still, spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const bob = useSharedValue(0);
  useEffect(() => {
    if (bubble && !still) bob.value = withSequence(withTiming(-4, { duration: 160 }), withTiming(0, { duration: 160 }));
  }, [bubble, still, bob]);
  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  const M = Math.min(width - 32, 330);

  return (
    <Screen>
      {/* top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: scene.goldSoft, textShadowColor: 'rgba(212,175,55,0.5)', textShadowRadius: 8 }}>
          Mittu AI
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Pressable accessibilityRole="button" accessibilityLabel={replaying ? 'Stop' : 'Replay last reading'} hitSlop={8}
            onPress={() => void replayLast()} style={iconBtn}>
            <Ionicons name={replaying ? 'stop' : 'refresh'} size={19} color={scene.goldSoft} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Unmute Mittu' : 'Mute Mittu'} hitSlop={8}
            onPress={() => setMuted(!muted)} style={iconBtn}>
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={19} color={scene.goldSoft} />
          </Pressable>
        </View>
      </View>

      {/* hero stage */}
      <View style={{ alignItems: 'center', marginTop: space.sm }}>
        <View style={{ width: M, height: S + 70, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: M, height: M, top: (S + 70 - M) / 2, opacity: 0.08 }, spinStyle]}>
            <SvgXml xml={MANDALA} width={M} height={M} />
          </Animated.View>
          <Sparkles width={M} height={S + 70} count={12} still={still} />
          <View style={{ width: S + 30, height: S + 60, alignItems: 'center' }}>
            <Perch x={(S + 30) / 2} rodY={S * 0.85} scale={S / 210} />
            <Mittu size={S} turban still={still} />
          </View>
          {bubble ? (
            <Animated.View style={[{ position: 'absolute', right: M / 2 - S * 0.95, top: 4, backgroundColor: '#FFF6DC', borderRadius: 14,
              paddingHorizontal: 10, paddingVertical: 4 }, bubbleStyle]}>
              <Text style={{ fontFamily: fonts.uiBold, color: '#3B2812', fontSize: 13 }}>Mittu Mittu! 🦜</Text>
            </Animated.View>
          ) : null}
        </View>
        <Text style={[type.callout, { color: colors.textSecondary, textAlign: 'center' }]}>
          {first ? `Namaste ${first}! ` : ''}Mittu bataega aapka bhavishya 🦜
        </Text>
      </View>

      {/* dock */}
      <View style={{ marginTop: space.lg, borderRadius: 22, padding: space.lg, gap: space.md, ...glass }}>
        <Chips options={CATEGORIES} value={category} onChange={setCategory} />

        {question || typing ? (
          <Field value={question} onChangeText={setQuestion} multiline maxLength={300} autoFocus={typing && !question}
            placeholder={listening ? 'Boliye… Mittu sun raha hai 🦜' : 'Apna sawaal likhiye...'}
            style={{ minHeight: 64, paddingTop: 12, textAlignVertical: 'top' }} />
        ) : null}

        {voiceSupported ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Type your question" hitSlop={8}
              onPress={() => setTyping((t) => !t)} style={[iconBtn, { width: 46, height: 46, borderRadius: 23 }, typing && { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="keypad-outline" size={21} color={scene.goldSoft} />
            </Pressable>
            <MicButton listening={listening} level={level} onPress={toggleMic} />
            <View style={{ width: 46 }} />
          </View>
        ) : null}
        {voiceSupported ? (
          <Text style={[type.subhead, { textAlign: 'center', marginTop: -space.sm }]}>
            {listening ? 'Boliye… Mittu sun raha hai' : 'Bolkar sawaal poochiye...'}
          </Text>
        ) : null}

        <Button title="Mittu, Card Nikaalo!" icon="sparkles" disabled={left <= 0} onPress={go} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={type.footnote}>
            {left > 0 ? `Aaj ${left} reading${left === 1 ? '' : 's'} baaki` : 'Aaj ki readings ho gayin. Kal phir aaiye!'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flash" size={14} color={quick ? scene.saffron : colors.textTertiary} />
            <Text style={[type.footnote, { color: colors.text }]}>Quick Draw</Text>
            <Switch value={quick} onValueChange={(v) => { setQuick(v); void setSkipAnimation(v); }}
              trackColor={{ true: colors.accent, false: colors.border }} thumbColor={quick ? scene.goldSoft : '#BDB5A6'} {...WEB_THUMB}
              style={{ transform: [{ scale: 0.8 }] }} />
          </View>
        </View>
      </View>
      <Text style={[type.footnote, { textAlign: 'center', marginTop: space.lg }]}>Sirf manoranjan ke liye 🦜</Text>
    </Screen>
  );
}

const iconBtn = {
  width: 38, height: 38, borderRadius: 19, alignItems: 'center' as const, justifyContent: 'center' as const,
  backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)',
};
