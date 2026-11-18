// The reading scene (meeting brief 2026-11-17): a strict ~5 s cinematic, then Mittu speaks, and you can talk back.
//   0-1.2 s   Mittu's squawk, wings spread, he flies an arc dropping green feathers
//   1.2-2.5 s a semicircle fan of 7 face-down cards opens
//   2.5-3.8 s he hovers, dives and takes one card with his beak
//   3.8-5.0 s the other cards dissolve, the chosen card floats to centre, flips with a gold burst, Mittu lands beside it
// No hang: the server work started on Home (lib/nav startReading: the backend draws the card in well under a second,
// then writes + voices the reading). The animation never waits for the voice; a watchdog forces the reveal at ~5.5 s.
// Mittu's voice is loaded during the animation, played at the reveal (beak and waveform follow its loudness), retried
// with a fresh link if it fails, and only falls back to the phone's voice when the phone has Hindi. While he speaks
// (or after), the mic button interrupts him for a follow-up question ("barge-in"), answered by voice.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { askFollowup, getConfig, getReading, type CardInfo, type Reading } from '@/api/mittu';
import { Flourish, ink, Parchment, Rod } from '@/components/Art';
import { MicButton } from '@/components/MicButton';
import { Mittu, type MittuMode } from '@/components/Mittu';
import { ReadingFooter, ReportSheet } from '@/components/Report';
import { Burst, Feather, NightBackdrop, Perch, Vignette } from '@/components/Scene';
import { FlipCard, roman } from '@/components/TarotCard';
import { track } from '@/lib/integrations';
import { currentReading, getSkipAnimation } from '@/lib/nav';
import {
  chirp, initSound, isMuted, lineFinished, loadVoice, onMuteChange, phoneHasHindi, play, sayLine, setMuted, speakOnDevice,
  stopLine, stopVoice, type LineName, type VoiceClip,
} from '@/lib/sound';
import { shareStory } from '@/lib/story';
import { listen, voiceSupported } from '@/lib/voice';
import { fonts, scene, space, type } from '@/theme';

const FAN = 7;
const CANCEL = new Error('cancelled');
const EASE = Easing.inOut(Easing.cubic);
const CAP_MS = 5500;        // hard cap for the cinematic once the card is known
const ENVELOPE_FPS = 20;

type Layout = ReturnType<typeof layout>;
function layout(w: number, h: number, top: number) {
  const S = Math.round(Math.min(108, w * 0.27));
  const cw = Math.round(Math.min(w * 0.46, 200, (h * 0.4) / 1.6));
  const ch = cw * 1.6;
  const cardTop = top + 60;
  const final = { x: w / 2, y: cardTop + ch / 2 };
  const landX = Math.min(w / 2 + cw / 2 + S * 0.12, w - S / 2 - 2);
  const fanCw = Math.min(w * 0.19, 78);
  const fanCh = fanCw * 1.6;
  // a semicircle fan (brief): 7 cards on an arc, -45° … +45°
  const R = Math.min(w * 0.42, 190);
  const cx = w / 2, cy = h * 0.66;
  const fan = [-45, -30, -15, 0, 15, 30, 45].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return { x: cx + R * Math.sin(a), y: cy - R * Math.cos(a), rot: deg };
  });
  const land = { x: landX, y: cardTop + ch - S * 0.3 };
  return { w, h, S, rodY: h - 120, perch: { x: w / 2, y: h - 120 - 0.36 * S }, cw, ch, final, land,
    rod: { x1: w / 2 + cw * 0.15, x2: Math.min(w - 4, landX + S * 0.55), y: land.y + S * 0.27 },
    fan, fanScale: fanCw / cw, fanCh, panelTop: cardTop + ch + 12 };
}

function useCardMotion() {
  return { x: useSharedValue(0), y: useSharedValue(0), rot: useSharedValue(0), scale: useSharedValue(0.3),
    opacity: useSharedValue(0), flip: useSharedValue(0) };
}
type CardMotion = ReturnType<typeof useCardMotion>;

function SceneCard({ m, L, children, z }: { m: CardMotion; L: Layout; children: React.ReactNode; z: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: m.opacity.value,
    transform: [{ translateX: m.x.value - L.cw / 2 }, { translateY: m.y.value - L.ch / 2 }, { rotate: `${m.rot.value}deg` }, { scale: m.scale.value }],
  }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, zIndex: z }, style]}>{children}</Animated.View>;
}

function MittuActor({ x, y, rot, scale, L, mode, facing, talking, still, level }: {
  x: SharedValue<number>; y: SharedValue<number>; rot: SharedValue<number>; scale: SharedValue<number>; L: Layout;
  mode: MittuMode; facing: 1 | -1; talking: boolean; still: boolean; level?: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - L.S / 2 }, { translateY: y.value - L.S / 2 }, { rotate: `${rot.value}deg` }, { scale: scale.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, zIndex: 30 }, style]}>
      <Mittu mode={mode} size={L.S} facing={facing} talking={talking} still={still} level={level} />
    </Animated.View>
  );
}

/** Word-by-word karaoke captions: words appear as they are spoken; the current one glows. */
function Subtitles({ words, current }: { words: string[]; current: number }) {
  const lines = useMemo(() => {
    const out: { from: number; to: number }[] = [];
    let from = 0;
    let len = 0;
    words.forEach((w, i) => {
      len += w.length + 1;
      if (/[.!?]$/.test(w) || (/[,…]$/.test(w) && len > 24) || len > 42 || i === words.length - 1) {
        out.push({ from, to: i });
        from = i + 1;
        len = 0;
      }
    });
    return out;
  }, [words]);
  const line = lines.find((l) => current >= l.from && current <= l.to) ?? (current < 0 ? lines[0] : lines[lines.length - 1]);
  if (!line) return null;
  return (
    <View style={styles.subs} accessibilityLiveRegion="polite">
      <Text style={{ textAlign: 'center', fontSize: 16, lineHeight: 24, fontFamily: fonts.uiMedium }}>
        {words.slice(line.from, line.to + 1).map((w, k) => {
          const i = line.from + k;
          return (
            <Text key={i} style={{ color: i === current ? '#FFF3C4' : i < current ? scene.goldSoft : 'rgba(243,220,138,0.28)',
              textShadowColor: i === current ? 'rgba(255,220,120,0.9)' : 'transparent', textShadowRadius: 10 }}>{w} </Text>
          );
        })}
      </Text>
    </View>
  );
}

/** Live audio waveform bar under Mittu. Driven by the animated loudness (`level`) on the UI thread, so it costs no
 *  React re-renders (those used to swallow taps on Roko / the mic while Mittu spoke). */
const BAR_SHAPE = Array.from({ length: 15 }, (_, i) => 0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + 0.6)));
function Bar({ k, level }: { k: number; level: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const b = Math.min(1, level.value * BAR_SHAPE[k] * 1.25);
    return { height: 4 + b * 24, opacity: 0.55 + b * 0.45 };
  });
  return <Animated.View style={[{ width: 4, borderRadius: 2, backgroundColor: k % 3 === 0 ? scene.saffron : scene.gold }, style]} />;
}
function Waveform({ level }: { level: SharedValue<number> }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 30, marginBottom: space.sm }}>
      {BAR_SHAPE.map((_, i) => <Bar key={i} k={i} level={level} />)}
    </View>
  );
}

/** The panel under the card. While Mittu thinks, speaks or listens it is a plain fixed view: inside a ScrollView
 *  (react-native-web) taps on Roko / the mic were swallowed as the subtitles changed. The finished scroll scrolls. */
function Panel({ scroll, top, bottom, children }: { scroll: boolean; top: number; bottom: number; children: React.ReactNode }) {
  const frame = { position: 'absolute' as const, left: 0, right: 0, top, bottom: 0, zIndex: 35 };
  return scroll ? (
    <ScrollView style={frame} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: bottom + space.lg }}>{children}</ScrollView>
  ) : (
    <View style={[frame, { paddingHorizontal: space.lg, paddingBottom: bottom }]}>{children}</View>
  );
}

// While Mittu's acted voice is being made (it can take ~10-15 s), he says these lines in his own voice (bundled clips)
// and the caption follows. After one round the captions keep changing silently, so he doesn't repeat himself.
const THINKING: { text: string; line: LineName }[] = [
  { text: 'Mittu Mittu! Soch raha hoon…', line: 'think_soch' },
  { text: 'Card ka sandesh padh raha hoon…', line: 'think_sandesh' },
  { text: 'Taaron se baat ho rahi hai… ✨', line: 'think_taare' },
  { text: 'Bas ek pal! Ab Mittu bolega…', line: 'think_pal' },
];
const LINE_DELAY_MS = 500;   // a voice that is already loaded starts without a waiting line in front of it

const estimateTimes = (words: string[], duration: number) => {
  const weight = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2 + (/[.!?…]$/.test(w) ? 6 : /[,]$/.test(w) ? 3 : 0));
  const total = weight.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return weight.map((x) => { const t = (acc / total) * duration; acc += x; return t; });
};

type Spoken = { text: string; audio_url: string | null; word_times: number[] | null; envelope?: string | null };
type Message = { text: string; helplines?: { name: string; phone: string }[] };

export default function ReadingScreen() {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const ticket = useRef(currentReading()).current;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const L = useMemo(() => (size ? layout(size.w, size.h, insets.top) : null), [size, insets.top]);

  // intro → reveal (card face up, Mittu speaking / thinking) → done (parchment); message = support / off-topic / error
  const [phase, setPhase] = useState<'intro' | 'reveal' | 'done' | 'message'>('intro');
  const [card, setCard] = useState<{ id: string; card: CardInfo; orientation: 'upright' | 'reversed' } | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [mode, setMode] = useState<MittuMode>('idle');
  const [facing, setFacing] = useState<1 | -1>(1);
  const [talking, setTalking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [thinkStep, setThinkStep] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const [wordIdx, setWordIdx] = useState(-1);
  const [useLevel, setUseLevel] = useState(false);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const [slot, setSlot] = useState(3);
  const [burst, setBurst] = useState(0);
  const [feathers, setFeathers] = useState<{ id: number; x: number; y: number; dir: 1 | -1 }[]>([]);
  const [muted, setMutedState] = useState(isMuted());
  const [reportId, setReportId] = useState<string | null>(null);
  const [perched, setPerched] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [followups, setFollowups] = useState<{ question: string; text: string }[]>([]);
  const [followupsLeft, setFollowupsLeft] = useState(2);
  const [sharing, setSharing] = useState<'idle' | 'busy' | 'copied'>('idle');

  const mx = useSharedValue(0), my = useSharedValue(0), mrot = useSharedValue(0), mscale = useSharedValue(1);
  const level = useSharedValue(0);
  const micLevel = useSharedValue(0);
  const dim = useSharedValue(0);
  const perchO = useSharedValue(1);
  const cards = [useCardMotion(), useCardMotion(), useCardMotion(), useCardMotion(), useCardMotion(), useCardMotion(), useCardMotion()];

  const run = useRef({ cancelled: false, timers: [] as ReturnType<typeof setTimeout>[], flaps: undefined as ReturnType<typeof setInterval> | undefined });
  const revealed = useRef(false);
  const chosenRef = useRef(Math.floor(Math.random() * FAN));
  const facingRef = useRef<1 | -1>(1);
  const preload = useRef<Promise<VoiceClip> | null>(null);
  const clipRef = useRef<VoiceClip | null>(null);
  const stopSpeech = useRef<(() => void) | null>(null);
  const stopListening = useRef<(() => void) | null>(null);
  const completed = useRef(false);
  const face = useCallback((d: 1 | -1) => { facingRef.current = d; setFacing(d); }, []);
  const linesOn = useRef(false);
  useEffect(() => {
    if (!thinking) return;
    setThinkStep(0);
    linesOn.current = true;
    let k = 0, t: ReturnType<typeof setTimeout>;
    const next = () => {
      if (!linesOn.current) return;   // the voice is ready: no new line
      setThinkStep(k);
      const secs = k < THINKING.length ? sayLine(THINKING[k].line) : 0;
      k++;
      t = setTimeout(next, Math.max(3000, secs * 1000 + 900));
    };
    t = setTimeout(next, LINE_DELAY_MS);
    return () => { linesOn.current = false; clearTimeout(t); stopLine(); };
  }, [thinking]);

  const wait = useCallback((ms: number) => new Promise<void>((resolve, reject) => {
    run.current.timers.push(setTimeout(() => (run.current.cancelled ? reject(CANCEL) : resolve()), ms));
  }), []);
  const flaps = (every: number | null) => {
    clearInterval(run.current.flaps);
    // One soft flutter when Mittu takes off / starts hovering. (It used to repeat every 150-220 ms while he flew,
    // which sounded like hammering: user feedback 2026-11-18.)
    if (every) play('flap', 0.18);
  };
  const flyTo = (x: number, y: number, ms: number) => {
    if (Math.abs(x - mx.value) > 6) face(x < mx.value ? -1 : 1);
    mx.value = withTiming(x, { duration: ms, easing: EASE });
    my.value = withTiming(y, { duration: ms, easing: EASE });
    return wait(ms);
  };

  // ---------------------------------------------------------------- Mittu speaks (reading or follow-up reply)
  const finishSpeaking = useCallback(() => {
    stopSpeech.current = null;
    clipRef.current = null;
    setTalking(false);
    setSpeaking(false);
    setUseLevel(false);
    level.value = withTiming(0, { duration: 120 });
    setMode('idle');
    setPhase((p) => (p === 'reveal' ? 'done' : p));
  }, [level]);

  const speak = useCallback(async (s: Spoken, opts: { preloaded?: Promise<VoiceClip> | null; refetch?: () => Promise<string | null> } = {}) => {
    stopSpeech.current?.();
    stopVoice();
    const ws = s.text.split(/\s+/);
    setWords(ws);
    setWordIdx(-1);
    setVoiceFailed(false);
    setThinking(true);   // "Mittu Mittu! Soch raha hoon…" until the voice starts: no flash of the result scroll
    let clip: VoiceClip | null = null;
    if (s.audio_url) clip = await (opts.preloaded ?? loadVoice(s.audio_url)).catch(() => null);
    if (!clip && opts.refetch) {   // expired link or a hiccup: one retry with a fresh link
      const url = await opts.refetch().catch(() => null);
      if (url) clip = await loadVoice(url).catch(() => null);
    }
    linesOn.current = false;   // let Mittu finish the waiting line he is saying, then the reading
    await lineFinished();
    setThinking(false);
    setSpeaking(true);
    setMode('talk');
    setTalking(true);
    await chirp();   // Mittu's squawk, then the reading (as in the original version)
    if (clip) {
      const env = s.envelope ?? '';
      let times = s.word_times;
      setUseLevel(!!env);
      clipRef.current = clip;
      stopSpeech.current = () => clip?.stop();
      clip.play((t) => {
        times ??= clip!.duration() > 0 ? estimateTimes(ws, clip!.duration()) : null;
        if (times) {
          let i = -1;
          while (i + 1 < times.length && times[i + 1] <= t + 0.05) i++;
          setWordIdx(i);
        }
        if (env) {
          const k = Math.floor(t * ENVELOPE_FPS);
          level.value = withTiming((Number(env[k]) || 0) / 9, { duration: 60 });
        }
      }, () => { clip?.stop(); finishSpeaking(); });
      return;
    }
    if (await phoneHasHindi()) {   // last resort: the phone's own Hindi voice
      const times = estimateTimes(ws, ws.length * 0.36);
      let t0 = 0;
      const tick = setInterval(() => {
        if (!t0) return;
        const t = (Date.now() - t0) / 1000;
        let i = -1;
        while (i + 1 < times.length && times[i + 1] <= t) i++;
        setWordIdx(i);
      }, 80);
      stopSpeech.current = () => { clearInterval(tick); stopVoice(); };
      speakOnDevice(s.text, () => { t0 = Date.now(); }, () => { clearInterval(tick); finishSpeaking(); });
      if (isMuted()) t0 = Date.now();
      return;
    }
    // No voice at all: show the words, offer "Phir se suniye" on the scroll.
    setVoiceFailed(true);
    setWordIdx(ws.length);
    finishSpeaking();
  }, [finishSpeaking, level]);

  const speakReading = useCallback((r: Reading, preloaded?: Promise<VoiceClip> | null) => speak(r, {
    preloaded,
    refetch: async () => (await getReading(r.id)).audio_url,
  }).then(() => {
    if (!completed.current) {
      completed.current = true;
      track('reading_completed', { card: r.card.id });
    }
  }), [speak]);

  // ---------------------------------------------------------------- the reveal (card face up, then the voice)
  const showMessage = useCallback((m: Message) => {
    run.current.cancelled = true;
    run.current.timers.forEach(clearTimeout);
    clearInterval(run.current.flaps);
    stopLine();
    setMessage(m);
    setPhase('message');
    setPerched(false);
    perchO.value = withTiming(1, { duration: 500 });
    cards.forEach((c) => { c.opacity.value = withTiming(0, { duration: 400 }); });
    if (L) {
      setMode('fly');
      mx.value = withTiming(L.perch.x, { duration: 900, easing: EASE });
      my.value = withTiming(L.perch.y, { duration: 900, easing: EASE });
      setTimeout(() => setMode('idle'), 950);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  const placeFinal = useCallback((chosen: number) => {
    if (!L) return;
    cards.forEach((c, i) => {
      if (i === chosen) {
        c.x.value = L.final.x; c.y.value = L.final.y; c.rot.value = 0; c.scale.value = 1; c.opacity.value = 1; c.flip.value = 180;
      } else c.opacity.value = 0;
    });
    mx.value = L.land.x; my.value = L.land.y; mrot.value = 0; mscale.value = 0.85;
    dim.value = 0.6;
    perchO.value = 0;
    face(-1);
    setMode('idle');
    setPerched(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  const reveal = useCallback(async () => {
    if (revealed.current || !ticket) return;
    revealed.current = true;
    setPhase('reveal');
    setFeathers([]);
    clearInterval(run.current.flaps);
    // (no account refresh here: Home refreshes today's count when it comes back into view; refreshing during the
    // screen transition re-rendered the route guards and could bounce the web version back to Home)
    // the card is face up; Mittu's words may still be on their way (they started on Home)
    setThinking(true);
    try {
      const r = await ticket.speak;
      setThinking(false);
      if (!r) return;
      setReading(r);
      void speakReading(r, preload.current);
    } catch (e) {
      setThinking(false);
      showMessage({ text: e instanceof ApiError && e.status === 402 ? 'Aapka plan active nahi hai.' : (e as Error).message });
    }
  }, [ticket, speakReading, showMessage]);

  // ---------------------------------------------------------------- the cinematic (max ~5 s)
  const cinematic = useCallback(async (chosen: number) => {
    if (!L || !ticket) return;
    const R = run.current;
    const fan = L.fan;
    // 0-1.2 s: squawk, wings spread, an arc across the sky with falling feathers; then "Ruko ruko, Mittu aapka card
    // dhoond raha hai!" in his voice (ends before the flip at ~5 s)
    void chirp().then(() => { if (!R.cancelled) sayLine('think_dhoond'); });
    setMode('fly');
    flaps(150);
    dim.value = withTiming(1, { duration: 600 });
    perchO.value = withDelay(300, withTiming(0, { duration: 600 }));
    const arc = [[L.w * 0.78, L.h * 0.42], [L.w * 0.6, L.h * 0.12], [L.w * 0.25, L.h * 0.16], [L.w * 0.5, L.h * 0.3]];
    const seg = 1200 / arc.length;
    mx.value = withSequence(...arc.map(([x]) => withTiming(x, { duration: seg, easing: Easing.inOut(Easing.sin) })));
    my.value = withSequence(...arc.map(([, y]) => withTiming(y, { duration: seg, easing: Easing.inOut(Easing.sin) })));
    mrot.value = withSequence(withTiming(-16, { duration: seg }), withTiming(8, { duration: seg }), withTiming(10, { duration: seg }), withTiming(0, { duration: seg }));
    [250, 600, 950].forEach((t, k) => R.timers.push(setTimeout(() => {
      setFeathers((f) => [...f, { id: Date.now() + k, x: mx.value, y: my.value + 10, dir: k % 2 ? 1 : -1 }]);
    }, t)));
    R.timers.push(setTimeout(() => face(-1), seg * 2), setTimeout(() => face(1), seg * 3));
    await wait(1200);
    // 1.2-2.5 s: the semicircle fan opens with a glow
    setMode('hover');
    flaps(220);
    cards.forEach((c, i) => {
      const spring = { damping: 17, stiffness: 140 };
      R.timers.push(setTimeout(() => {
        c.opacity.value = withTiming(1, { duration: 250 });
        c.x.value = withSpring(fan[i].x, spring);
        c.y.value = withSpring(fan[i].y, spring);
        c.rot.value = withSpring(fan[i].rot, spring);
        c.scale.value = withSpring(L.fanScale, spring);
      }, i * 50));
    });
    await flyTo(L.w / 2, fan[3].y - L.fanCh * 1.3, 700);
    await wait(600);
    // 2.5-3.8 s: one brisk look at another card, then the dive for the chosen one
    const other = [0, 1, 2, 3, 4, 5, 6].filter((i) => i !== chosen)[Math.floor(Math.random() * 6)];
    setMode('fly');
    await flyTo(fan[other].x, fan[other].y - L.fanCh * 0.95, 300);
    cards[other].scale.value = withSequence(withTiming(L.fanScale * 1.12, { duration: 150 }), withTiming(L.fanScale, { duration: 200 }));
    await wait(150);
    const pc = fan[chosen];
    await flyTo(pc.x, pc.y - L.fanCh * 1.0, 300);
    setMode('hover');
    cards[chosen].scale.value = withTiming(L.fanScale * 1.15, { duration: 150 });
    await wait(120);
    const rad = (pc.rot * Math.PI) / 180;
    const top = { x: pc.x + Math.sin(rad) * (L.fanCh / 2), y: pc.y - Math.cos(rad) * (L.fanCh / 2) };
    setMode('pick');
    setSlot(chosen);
    const f = facingRef.current;
    await flyTo(top.x - 0.32 * L.S * f, top.y - 0.05 * L.S, 230);
    await wait(100);
    // 3.8-5.0 s: the others dissolve; the card floats to centre stage and flips; Mittu lands beside it
    cards.forEach((c, i) => {
      if (i === chosen) return;
      c.opacity.value = withTiming(0, { duration: 350 });
      c.scale.value = withTiming(L.fanScale * 0.8, { duration: 350 });
    });
    const k = cards[chosen];
    setMode('fly');
    flyTo(L.w * 0.84, L.h * 0.14, 500).catch(() => {});
    k.x.value = withTiming(L.final.x, { duration: 550, easing: Easing.out(Easing.cubic) });
    k.y.value = withTiming(L.final.y, { duration: 550, easing: Easing.out(Easing.cubic) });
    k.rot.value = withTiming(0, { duration: 450 });
    k.scale.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) });
    await wait(560);
    play('flip', 0.6);
    k.flip.value = withTiming(180, { duration: 460, easing: Easing.bezier(0.45, 0, 0.2, 1) });
    await wait(230);
    setBurst(Date.now());
    dim.value = withTiming(0.6, { duration: 600 });
    setPerched(true);
    face(L.land.x < mx.value ? -1 : 1);
    mx.value = withTiming(L.land.x, { duration: 420, easing: Easing.out(Easing.cubic) });
    my.value = withSequence(withTiming(L.land.y - 26, { duration: 260 }), withTiming(L.land.y, { duration: 160 }));
    mscale.value = withTiming(0.85, { duration: 420 });
    await wait(430);
    clearInterval(R.flaps);
    face(-1);
    setMode('land');
    play('flap', 0.15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, wait, face, ticket]);

  // ---------------------------------------------------------------- start
  useEffect(() => {
    if (!ticket) {
      router.replace('/home');
      return;
    }
    track('reading_started', { category: ticket.category });
    getConfig().then((c) => setFollowupsLeft(c.followupsPerReading ?? 2)).catch(() => {});
    // the card (instant), then the words + voice: preload the clip the moment its link arrives
    ticket.draw.then((d) => { if (d.kind === 'card') setCard(d); }).catch(() => {});
    ticket.speak.then((r) => { if (r?.audio_url) preload.current = loadVoice(r.audio_url, 15_000); }).catch(() => {});
    const off = onMuteChange(setMutedState);
    const R = run.current;
    return () => {
      R.cancelled = true;
      R.timers.forEach(clearTimeout);
      clearInterval(R.flaps);
      stopSpeech.current?.();
      stopListening.current?.();
      stopVoice();
      stopLine();
      preload.current?.then((c) => c.stop()).catch(() => {});
      off();
    };
  }, [ticket]);

  useEffect(() => {
    if (!L || !ticket) return;
    mx.value = L.perch.x;
    my.value = L.perch.y;
    cards.forEach((c) => { c.x.value = L.w / 2; c.y.value = L.h * 0.62; c.scale.value = L.fanScale * 0.6; });
    const chosen = chosenRef.current;
    (async () => {
      await initSound();
      let d;
      const quick = reducedMotion || (await getSkipAnimation());
      const started = Date.now();
      // the card normally arrives long before it's needed; the cinematic itself never waits more than CAP_MS
      const cine = quick ? null : cinematic(chosen).catch((e) => { if (e !== CANCEL) throw e; });
      try {
        d = await ticket.draw;
      } catch (e) {
        return showMessage({ text: e instanceof ApiError && e.status === 402 ? 'Aapka plan active nahi hai.' : (e as Error).message });
      }
      if (d.kind !== 'card') return showMessage({ text: d.text, helplines: d.kind === 'support' ? d.helplines : undefined });
      if (quick) {
        track('reading_skipped_animation', { reason: reducedMotion ? 'reduced_motion' : 'quick_draw' });
        setSlot(chosen);
        placeFinal(chosen);
        play('flip', 0.6);
        setBurst(Date.now());
        return reveal();
      }
      // hard cap: whatever happens to the timers, the card is face up by ~5.5 s
      const left = Math.max(400, CAP_MS - (Date.now() - started));
      const capped = await Promise.race([cine?.then(() => 'done'), new Promise((r) => setTimeout(() => r('cap'), left))]);
      if (run.current.cancelled && revealed.current) return;
      if (capped === 'cap') {
        run.current.cancelled = true;
        run.current.timers.forEach(clearTimeout);
        setSlot(chosen);
        placeFinal(chosen);
        setBurst(Date.now());
      }
      void reveal();
    })();
    // Runs once, when the scene has its size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L !== null]);

  function quickReveal() {
    if (phase !== 'intro' || !card) return;
    track('reading_skipped_animation', { reason: 'button' });
    run.current.cancelled = true;
    run.current.timers.forEach(clearTimeout);
    clearInterval(run.current.flaps);
    setFeathers([]);
    setSlot(chosenRef.current);
    placeFinal(chosenRef.current);
    play('flip', 0.6);
    setBurst(Date.now());
    void reveal();
  }

  // ---------------------------------------------------------------- talk back (barge-in follow-up)
  async function ask(question: string) {
    if (!reading || question.trim().length < 2) return;
    setThinking(true);
    setPhase('reveal');
    try {
      const r = await askFollowup(reading.id, question.trim());
      setThinking(false);
      if (r.kind !== 'followup') {
        setFollowups((f) => [...f, { question, text: r.text }]);
        setPhase('done');
        return;
      }
      setFollowupsLeft(r.left);
      setFollowups((f) => [...f, { question, text: r.text }]);
      track('followup_answered', { card: reading.card.id });
      await speak(r);
    } catch (e) {
      setThinking(false);
      setFollowups((f) => [...f, { question, text: (e as Error).message }]);
      setPhase('done');
    }
  }

  function toggleMic() {
    if (listening) {
      stopListening.current?.();
      return;
    }
    // interrupt Mittu right away
    stopSpeech.current?.();
    stopVoice();
    finishSpeaking();
    setHeard('');
    setListening(true);
    let said = '';
    stopListening.current = listen((t) => { said = t; setHeard(t); }, () => {
      stopListening.current = null;
      setListening(false);
      micLevel.value = withTiming(0, { duration: 150 });
      if (said.trim().length >= 2) void ask(said);
    }, (l) => { micLevel.value = withTiming(l, { duration: 90 }); });
  }

  async function share(r: Reading) {
    track('reading_shared', { card: r.card.id });
    setSharing('busy');
    const result = await shareStory(r).catch(() => 'failed' as const);
    setSharing(result === 'copied' ? 'copied' : 'idle');
    if (result === 'copied') setTimeout(() => setSharing('idle'), 2500);
  }

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const perchStyle = useAnimatedStyle(() => ({ opacity: perchO.value }));
  const still = !!reducedMotion;
  const shown = card?.card ?? null;
  const canAsk = voiceSupported && !!reading && followupsLeft > 0;

  return (
    <View style={{ flex: 1, backgroundColor: scene.night }} onLayout={(e) => {
      const { width, height } = e.nativeEvent.layout;
      if (!size) setSize({ w: width, h: height });
    }}>
      {L ? (
        <>
          <NightBackdrop width={L.w} height={L.h} mandalaY={L.final.y} still={still} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,3,20,0.55)' }, dimStyle]} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, perchStyle]}>
            <Perch x={L.perch.x} rodY={L.rodY} />
          </Animated.View>
          {cards.map((c, i) => (
            <SceneCard key={i} m={c} L={L} z={i === slot && phase !== 'intro' ? 22 : 10 + i + (i === slot ? 5 : 0)}>
              <FlipCard card={i === slot ? shown : null} reversed={card?.orientation === 'reversed'} width={L.cw} flip={c.flip} />
            </SceneCard>
          ))}
          {feathers.map((f) => <Feather key={f.id} x={f.x} y={f.y} dir={f.dir} />)}
          <MittuActor x={mx} y={my} rot={mrot} scale={mscale} L={L} mode={mode} facing={facing} talking={talking && !useLevel}
            still={still} level={useLevel ? level : undefined} />
          <Rod x1={L.rod.x1} x2={L.rod.x2} y={L.rod.y} visible={perched} />
          {burst ? <Burst key={burst} seed={burst} x={L.final.x} y={L.final.y} radius={L.cw * 0.9} /> : null}
          <Vignette width={L.w} height={L.h} />

          {phase === 'intro' ? (
            <View pointerEvents="none" style={[styles.status, { bottom: insets.bottom + 24 }]}>
              <Text style={[type.subhead, { color: 'rgba(246,238,219,0.7)', textAlign: 'center' }]}>Mittu card chun raha hai…</Text>
            </View>
          ) : null}

          {(phase === 'reveal' || phase === 'done') && shown ? (
            <Panel scroll={!(listening || thinking || speaking) && !!reading} top={L.panelTop} bottom={insets.bottom}>
              <Text style={styles.caption}>
                {roman(shown.id)} • {shown.name} — {shown.hindi}{card?.orientation === 'reversed' ? ' (Ulta)' : ''}
              </Text>

              {listening ? (
                <View style={{ alignItems: 'center' }}>
                  <View style={[styles.subs, { alignSelf: 'stretch' }]}>
                    <Text style={{ textAlign: 'center', color: scene.goldSoft, fontFamily: fonts.uiMedium, fontSize: 16 }}>
                      {heard || 'Boliye… Mittu sun raha hai 🦜'}
                    </Text>
                  </View>
                  <MicButton listening level={micLevel} onPress={toggleMic} size={64} />
                </View>
              ) : thinking ? (
                <View style={[styles.subs, { alignItems: 'center' }]}>
                  <Text style={{ color: scene.goldSoft, fontFamily: fonts.uiMedium, fontSize: 16, textAlign: 'center' }}>{THINKING[thinkStep % THINKING.length].text}</Text>
                </View>
              ) : speaking ? (
                <View style={{ alignItems: 'center' }}>
                  <View style={{ alignSelf: 'stretch' }}><Subtitles words={words} current={wordIdx} /></View>
                  <Waveform level={level} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <Pressable accessibilityRole="button" onPress={() => { stopSpeech.current?.(); stopVoice(); finishSpeaking(); }}
                      style={styles.pillBtn}>
                      <Ionicons name="stop" size={16} color={scene.goldSoft} />
                      <Text style={styles.ghostText}>Roko</Text>
                    </Pressable>
                    {canAsk ? <MicButton listening={false} level={micLevel} onPress={toggleMic} size={58} label="Tap to interrupt and ask a follow-up" /> : null}
                  </View>
                  {canAsk ? <Text style={[type.footnote, { color: scene.goldSoft, marginTop: 2 }]}>Tap to Interrupt / Ask Follow-up 🎙️</Text> : null}
                </View>
              ) : reading ? (
                <Parchment>
                  <Text style={styles.scrollTitle}>Aapka result</Text>
                  <Flourish />
                  {reading.sandesh ? (
                    <>
                      <Text style={styles.section}>Card ka Sandesh</Text>
                      <Text style={styles.scrollText}>{reading.sandesh}</Text>
                      <Text style={styles.section}>Mittu ki Salah</Text>
                      <Text style={styles.scrollText}>{reading.salah}</Text>
                    </>
                  ) : <Text style={styles.scrollText}>{reading.text}</Text>}
                  {reading.lucky_color || reading.lucky_number ? (
                    <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
                      {reading.lucky_color ? (
                        <View style={styles.luckyBox}><Text style={styles.luckyLabel}>Lucky Color</Text><Text style={styles.luckyValue}>{reading.lucky_color}</Text></View>
                      ) : null}
                      {reading.lucky_number ? (
                        <View style={styles.luckyBox}><Text style={styles.luckyLabel}>Lucky Number</Text><Text style={styles.luckyValue}>{reading.lucky_number}</Text></View>
                      ) : null}
                    </View>
                  ) : null}
                  {followups.map((f, i) => (
                    <View key={i} style={{ marginTop: space.md, paddingLeft: space.md, borderLeftWidth: 2, borderLeftColor: 'rgba(154,116,32,0.5)' }}>
                      <Text style={[styles.scrollText, { fontStyle: 'italic', color: ink.soft }]}>“{f.question}”</Text>
                      <Text style={styles.scrollText}>{f.text}</Text>
                    </View>
                  ))}
                  {voiceFailed ? (
                    <Text style={[styles.scrollText, { color: ink.soft, marginTop: space.sm }]}>Mittu ki awaaz abhi nahi aa paayi. Neeche Replay Voice dabaiye.</Text>
                  ) : null}
                  {canAsk ? (
                    <View style={{ alignItems: 'center', marginTop: space.md }}>
                      <MicButton listening={false} level={micLevel} onPress={toggleMic} size={56} label="Ask Mittu a follow-up" />
                      <Text style={[styles.scrollText, { fontSize: 13, color: ink.soft, marginTop: -4 }]}>
                        Mittu se aur poochiye 🎙️ ({followupsLeft} baaki)
                      </Text>
                    </View>
                  ) : null}
                  <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.scrollBtn, { backgroundColor: scene.gold, borderColor: '#9A7420', marginTop: space.lg }]}>
                    <Ionicons name="sparkles" size={17} color="#1B1240" />
                    <Text style={[styles.ghostText, { color: '#1B1240' }]}>Ek Aur Card</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={sharing === 'busy'} onPress={() => void share(reading)} style={styles.scrollBtn}>
                    <Ionicons name="share-social-outline" size={17} color={scene.goldSoft} />
                    <Text style={styles.ghostText}>{sharing === 'busy' ? 'Ban raha hai…' : sharing === 'copied' ? 'Save ho gaya!' : 'Share Story (9:16)'}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => void speakReading(reading)} style={styles.scrollBtn}>
                    <Ionicons name="volume-high-outline" size={17} color={scene.goldSoft} />
                    <Text style={styles.ghostText}>Replay Voice 🔊</Text>
                  </Pressable>
                  <ReadingFooter color={ink.soft} onReport={() => setReportId(reading.id)} />
                </Parchment>
              ) : null}
            </Panel>
          ) : null}

          {phase === 'message' && message ? (
            <View style={[styles.messageWrap, { top: L.h * 0.18, paddingBottom: insets.bottom }]}>
              <View style={styles.textBox}>
                <Text style={{ color: scene.text, fontSize: 16, lineHeight: 24, fontFamily: fonts.ui }}>{message.text}</Text>
                {message.helplines ? (
                  <View style={{ gap: space.sm, marginTop: space.md }}>
                    {message.helplines.map((h) => (
                      <Pressable key={h.phone} accessibilityRole="button" onPress={() => Linking.openURL(`tel:${h.phone}`)}
                        style={[styles.ghostBtn, { backgroundColor: scene.gold, borderColor: scene.gold }]}>
                        <Ionicons name="call" size={16} color="#1B1240" />
                        <Text style={[styles.ghostText, { color: '#1B1240' }]}>{h.name}: {h.phone}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
              <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.ghostBtn, { marginTop: space.md }]}>
                <Text style={styles.ghostText}>Wapas jaaiye</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.topBar, { top: insets.top + 8 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => router.back()} style={styles.round}>
              <Ionicons name="close" size={22} color={scene.goldSoft} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {phase === 'intro' && card && !still ? (
                <Pressable accessibilityRole="button" onPress={quickReveal} style={[styles.round, { width: undefined, paddingHorizontal: 14 }]}>
                  <Ionicons name="flash" size={15} color={scene.saffron} />
                  <Text style={styles.ghostText}> Quick Draw</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Unmute' : 'Mute'} hitSlop={10}
                onPress={() => setMuted(!muted)} style={styles.round}>
                <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={20} color={scene.goldSoft} />
              </Pressable>
            </View>
          </View>
        </>
      ) : null}
      <ReportSheet readingId={reportId} onClose={() => setReportId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', zIndex: 50 },
  round: { height: 40, minWidth: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    backgroundColor: 'rgba(30,20,70,0.7)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)' },
  status: { position: 'absolute', left: 0, right: 0 },
  caption: { fontFamily: fonts.display, color: scene.goldSoft, textAlign: 'center', fontSize: 17, lineHeight: 24, marginBottom: space.md,
    textShadowColor: 'rgba(212,175,55,0.55)', textShadowRadius: 10 },
  scrollTitle: { fontFamily: fonts.display, color: ink.text, textAlign: 'center', fontSize: 23 },
  section: { fontFamily: fonts.display, color: ink.gold, fontSize: 15, marginTop: space.md, letterSpacing: 0.4 },
  scrollText: { color: ink.text, fontSize: 15.5, lineHeight: 23, fontFamily: fonts.ui, marginTop: 4 },
  luckyBox: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(154,116,32,0.5)', backgroundColor: 'rgba(255,248,225,0.45)' },
  luckyLabel: { color: ink.soft, fontSize: 12, letterSpacing: 0.4, fontFamily: fonts.uiMedium },
  luckyValue: { fontFamily: fonts.display, color: ink.text, fontSize: 17, marginTop: 2, textAlign: 'center' },
  scrollBtn: { height: 48, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.sm,
    backgroundColor: '#1E1650', borderWidth: 1, borderColor: 'rgba(212,175,55,0.6)' },
  subs: { borderRadius: 16, paddingHorizontal: space.lg, paddingVertical: space.md, marginBottom: space.sm,
    backgroundColor: 'rgba(14,9,40,0.92)', borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.75)', minHeight: 52, justifyContent: 'center' },
  textBox: { borderRadius: 16, padding: space.lg, backgroundColor: 'rgba(20,13,58,0.85)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)' },
  ghostBtn: { flex: 1, height: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.6)' },
  ghostText: { color: scene.goldSoft, fontSize: 15, fontFamily: fonts.uiBold },
  pillBtn: { height: 46, paddingHorizontal: 18, borderRadius: 23, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.6)', backgroundColor: 'rgba(30,20,70,0.7)' },
  messageWrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 40 },
});
