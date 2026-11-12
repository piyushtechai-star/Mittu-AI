// The reading scene (guide 06/07 + HouseofTech storyboard 5-12): about 9 seconds, skippable, then Mittu speaks.
//   5. cinematic zoom: a bansuri in a spinning gold ring, notes, ambient santoor   6. Mittu takes off in an arc, feathers
//   7. 7 face-down cards spread in two rows   8. Mittu hovers over 2-3 (they glow)   9. picks one with his beak
//   10. 3D flip with a gold swirl, sparkle and chime   11. Mittu lands on the rod beside it: "Suno suno...", voice + subtitles
//   12. parchment scroll: the reading, lucky colour and number, Ek aur card / Share Karo / Replay Voice
// The card comes from the backend (POST /reading); Mittu keeps hovering until it has arrived.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { askMittu, getReading, type Reading, type ReadingResult } from '@/api/mittu';
import { Flourish, FluteZoom, ink, Parchment, Rod, Swirl } from '@/components/Art';
import { Mittu, type MittuMode } from '@/components/Mittu';
import { ReadingFooter, ReportSheet } from '@/components/Report';
import { Burst, Feather, NightBackdrop, Perch, Vignette } from '@/components/Scene';
import { FlipCard } from '@/components/TarotCard';
import { useAuth } from '@/context/AuthContext';
import { track } from '@/lib/integrations';
import { getSkipAnimation, takePendingReading } from '@/lib/nav';
import {
  initSound, isMuted, onMuteChange, play, playVoice, setMuted, speakOnDevice, startAmbient, stopAmbient, stopVoice,
} from '@/lib/sound';
import { scene, serif, space, type } from '@/theme';

const FAN = 7;
const CANCEL = new Error('cancelled');
const EASE = Easing.inOut(Easing.cubic);

type Layout = ReturnType<typeof layout>;
function layout(w: number, h: number, top: number) {
  const S = Math.round(Math.min(112, w * 0.28));
  const perchRod = h - 120;
  const cw = Math.round(Math.min(w * 0.5, 210, (h * 0.44) / 1.6));
  const ch = cw * 1.6;
  const cardTop = top + 64;
  const final = { x: w / 2, y: cardTop + ch / 2 };
  const landX = Math.min(w / 2 + cw / 2 + S * 0.12, w - S / 2 - 2);
  const fanCw = Math.min(w * 0.2, 80);
  const fanCh = fanCw * 1.6;
  // Two rows (storyboard 7): 3 at the back, 4 in front overlapping them.
  const R = w * 0.78;
  const row = (deg: number, cy: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: w / 2 + R * Math.sin(a), y: cy + R - R * Math.cos(a), rot: deg };
  };
  const backY = h * 0.36;
  const fan = [...[-15, 0, 15].map((d) => row(d, backY)), ...[-24, -8, 8, 24].map((d) => row(d, backY + fanCh * 0.7))];
  const land = { x: landX, y: cardTop + ch - S * 0.3 };
  return { w, h, S, rodY: perchRod, perch: { x: w / 2, y: perchRod - 0.36 * S }, cw, ch, final, land,
    rod: { x1: w / 2 + cw * 0.15, x2: Math.min(w - 4, landX + S * 0.55), y: land.y + S * 0.27 },
    fan, fanScale: fanCw / cw, fanCh, panelTop: cardTop + ch + 16 };
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

function MittuActor({ x, y, rot, scale, L, mode, facing, talking, still }: {
  x: SharedValue<number>; y: SharedValue<number>; rot: SharedValue<number>; scale: SharedValue<number>; L: Layout;
  mode: MittuMode; facing: 1 | -1; talking: boolean; still: boolean;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - L.S / 2 }, { translateY: y.value - L.S / 2 }, { rotate: `${rot.value}deg` }, { scale: scale.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, zIndex: 30 }, style]}>
      <Mittu mode={mode} size={L.S} facing={facing} talking={talking} still={still} />
    </Animated.View>
  );
}

/** Word-by-word subtitles: words appear as they are spoken; the current one glows. */
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
      <Text style={{ textAlign: 'center', fontSize: 16, lineHeight: 23, fontWeight: '500' }}>
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

const estimateTimes = (words: string[], duration: number) => {
  const weight = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2 + (/[.!?…]$/.test(w) ? 6 : /[,]$/.test(w) ? 3 : 0));
  const total = weight.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return weight.map((x) => { const t = (acc / total) * duration; acc += x; return t; });
};

/** "...Lucky color, sunhera peela... lucky number, das!" -> { color: 'Sunhera peela', number: 'Das' } for the scroll. */
const pickLucky = (re: RegExp, t: string) => {
  const v = t.match(re)?.[1]?.trim().replace(/^(hai|is)\s+/i, '');
  return v ? v[0].toUpperCase() + v.slice(1) : null;
};
const luckyOf = (t: string) => ({
  color: pickLucky(/(?:lucky\s*colou?r|लकी\s*(?:कलर|रंग))\s*[,:\-–]?\s*([^.!?…।,]+)/i, t),
  number: pickLucky(/(?:lucky\s*number|लकी\s*नंबर)\s*[,:\-–]?\s*([^.!?…।,]+)/i, t),
});

export default function ReadingScreen() {
  const insets = useSafeAreaInsets();
  const { refresh } = useAuth();
  const reducedMotion = useReducedMotion();
  const input = useRef(takePendingReading()).current;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const L = useMemo(() => (size ? layout(size.w, size.h, insets.top) : null), [size, insets.top]);

  const [phase, setPhase] = useState<'intro' | 'revealed' | 'message'>('intro');
  const [result, setResult] = useState<ReadingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<MittuMode>('idle');
  const [facing, setFacing] = useState<1 | -1>(1);
  const [talking, setTalking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [wordIdx, setWordIdx] = useState(-1);
  const [slot, setSlot] = useState(3);
  const [burst, setBurst] = useState(0);
  const [feathers, setFeathers] = useState<{ id: number; x: number; y: number; dir: 1 | -1 }[]>([]);
  const [muted, setMutedState] = useState(isMuted());
  const [reportId, setReportId] = useState<string | null>(null);
  const [flute, setFlute] = useState(false);
  const [perched, setPerched] = useState(false);
  const [copied, setCopied] = useState(false);

  const mx = useSharedValue(0), my = useSharedValue(0), mrot = useSharedValue(0), mscale = useSharedValue(1);
  const dim = useSharedValue(0);
  const cards = [useCardMotion(), useCardMotion(), useCardMotion(), useCardMotion(), useCardMotion(), useCardMotion(), useCardMotion()];

  const run = useRef({ cancelled: false, timers: [] as ReturnType<typeof setTimeout>[], flaps: undefined as ReturnType<typeof setInterval> | undefined });
  const resultRef = useRef<Promise<ReadingResult> | null>(null);
  const audioAt = useRef(0);
  const stopSpeech = useRef<(() => void) | null>(null);
  const completed = useRef(false);
  const facingRef = useRef<1 | -1>(1);
  const chosenRef = useRef(3);
  const face = useCallback((d: 1 | -1) => { facingRef.current = d; setFacing(d); }, []);

  const wait = useCallback((ms: number) => new Promise<void>((resolve, reject) => {
    run.current.timers.push(setTimeout(() => (run.current.cancelled ? reject(CANCEL) : resolve()), ms));
  }), []);
  const flaps = (every: number | null) => {
    clearInterval(run.current.flaps);
    if (every) run.current.flaps = setInterval(() => play('flap', 0.4), every);
  };
  const flyTo = (x: number, y: number, ms: number) => {
    if (Math.abs(x - mx.value) > 6) face(x < mx.value ? -1 : 1);
    mx.value = withTiming(x, { duration: ms, easing: EASE });
    my.value = withTiming(y, { duration: ms, easing: EASE });
    return wait(ms);
  };

  // ---------------------------------------------------------------- the voice
  const speak = useCallback(async (r: Reading) => {
    stopSpeech.current?.();
    stopVoice();
    setWordIdx(-1);
    setSpeaking(true);
    play('squawk', 0.9);
    setTalking(true);
    await new Promise((res) => setTimeout(res, 650));
    setTalking(false);
    const words = r.text.split(/\s+/);
    const done = () => {
      stopSpeech.current = null;
      setTalking(false);
      setSpeaking(false);
      setMode('idle');
      setWordIdx(words.length);
      if (!completed.current) {
        completed.current = true;
        track('reading_completed', { card: r.card.id });
      }
    };
    let url = r.audio_url;
    if (url && Date.now() - audioAt.current > 50 * 60_000) url = (await getReading(r.id).catch(() => null))?.audio_url ?? null; // signed URLs last 1 h
    if (url) {
      try {
        let times = r.word_times;
        stopSpeech.current = await playVoice(url, (t, d) => {
          times ??= d > 0 ? estimateTimes(words, d) : null;
          if (!times) return;
          let i = -1;
          while (i + 1 < times.length && times[i + 1] <= t + 0.05) i++;
          setWordIdx(i);
        }, done);
        audioAt.current = audioAt.current || Date.now();
        setMode('talk');
        setTalking(true);
        return;
      } catch {}
    }
    // No clip: the phone's own voice, with estimated subtitle timing.
    const times = estimateTimes(words, words.length * 0.36);
    let t0 = 0;
    const tick = setInterval(() => {
      if (!t0) return;
      const t = (Date.now() - t0) / 1000;
      let i = -1;
      while (i + 1 < times.length && times[i + 1] <= t) i++;
      setWordIdx(i);
    }, 80);
    setMode('talk');
    setTalking(true);
    stopSpeech.current = () => { clearInterval(tick); stopVoice(); done(); };
    speakOnDevice(r.text, () => { t0 = Date.now(); }, () => { clearInterval(tick); done(); });
    if (isMuted()) t0 = Date.now();
  }, []);

  // ---------------------------------------------------------------- placing things
  const placeFinal = useCallback((chosen: number) => {
    if (!L) return;
    cards.forEach((c, i) => {
      if (i === chosen) {
        c.x.value = L.final.x; c.y.value = L.final.y; c.rot.value = 0; c.scale.value = 1; c.opacity.value = 1; c.flip.value = 180;
      } else c.opacity.value = 0;
    });
    mx.value = L.land.x; my.value = L.land.y; mrot.value = 0; mscale.value = 0.85;
    dim.value = 0.6;
    face(-1);
    setMode('idle');
    setPerched(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  const reveal = useCallback((r: ReadingResult, chosen: number) => {
    setResult(r);
    if (r.kind !== 'reading') return;
    setPhase('revealed');
    void refresh();
    void speak(r);
  }, [refresh, speak]);

  // ---------------------------------------------------------------- the cinematic
  const cinematic = useCallback(async (chosen: number) => {
    if (!L || !resultRef.current) return;
    const R = run.current;
    const fan = L.fan;
    // 5) cinematic zoom: bansuri in a gold ring, ambient santoor, whoosh
    play('whoosh', 0.8);
    startAmbient();
    dim.value = withTiming(1, { duration: 900 });
    setFlute(true);
    await wait(1800);
    setFlute(false);
    // 2) take off in an arc, feathers fall
    setMode('fly');
    flaps(170);
    const arc = [[L.w * 0.74, L.perch.y - L.h * 0.2], [L.w * 0.86, L.h * 0.3], [L.w * 0.55, L.h * 0.1], [L.w * 0.22, L.h * 0.15], [L.w * 0.5, L.h * 0.2]];
    const seg = 1600 / arc.length;
    mx.value = withSequence(...arc.map(([x]) => withTiming(x, { duration: seg, easing: Easing.inOut(Easing.sin) })));
    my.value = withSequence(...arc.map(([, y]) => withTiming(y, { duration: seg, easing: Easing.inOut(Easing.sin) })));
    mrot.value = withSequence(withTiming(-18, { duration: seg }), withTiming(-6, { duration: seg }), withTiming(8, { duration: seg }),
      withTiming(10, { duration: seg }), withTiming(0, { duration: seg }));
    [300, 700, 1150].forEach((t, k) => R.timers.push(setTimeout(() => {
      setFeathers((f) => [...f, { id: Date.now() + k, x: mx.value, y: my.value + 10, dir: k % 2 ? 1 : -1 }]);
    }, t)));
    R.timers.push(setTimeout(() => face(-1), seg * 2), setTimeout(() => face(1), seg * 4));
    await wait(1600);
    // 3) seven cards fan out
    setMode('hover');
    flaps(240);
    play('shuffle', 0.9);
    cards.forEach((c, i) => {
      const spring = { damping: 16, stiffness: 120 };
      R.timers.push(setTimeout(() => {
        c.opacity.value = withTiming(1, { duration: 300 });
        c.x.value = withSpring(fan[i].x, spring);
        c.y.value = withSpring(fan[i].y, spring);
        c.rot.value = withSpring(fan[i].rot, spring);
        c.scale.value = withSpring(L.fanScale, spring);
      }, i * 70));
    });
    await wait(1400);
    // 4) suspense: hover over at least two other cards, and keep "choosing" (card to card, slower and slower)
    //    until the backend's card and Mittu's voice are ready (the acted voice takes ~10 s to make).
    let ready = false;
    resultRef.current.then(() => { ready = true; }, () => { ready = true; });
    const others = [0, 1, 2, 3, 4, 5, 6].filter((i) => i !== chosen);
    let last = -1;
    for (let n = 0; n < 2 || (!ready && n < 40); n++) {
      const pool = others.filter((i) => i !== last);
      const i = pool[Math.floor(Math.random() * pool.length)];
      last = i;
      setMode('fly');
      await flyTo(fan[i].x, fan[i].y - L.fanCh * 0.95, n < 2 ? 380 : 620);
      setMode('hover');
      cards[i].y.value = withSequence(withTiming(fan[i].y - 10, { duration: 220 }), withTiming(fan[i].y, { duration: 220 }));
      cards[i].scale.value = withSequence(withTiming(L.fanScale * 1.12, { duration: 220 }), withTiming(L.fanScale, { duration: 320 }));
      await wait(n < 2 ? 220 : 650);
    }
    const r = await resultRef.current;   // API errors (limit reached, busy) are thrown here → message
    if (R.cancelled) throw CANCEL;
    if (r.kind !== 'reading') return r;
    const pc = fan[chosen];
    setMode('fly');
    await flyTo(pc.x, pc.y - L.fanCh * 1.05, 360);
    setMode('hover');
    await wait(240);
    // dive and take the card with the beak
    const rad = (pc.rot * Math.PI) / 180;
    const top = { x: pc.x + Math.sin(rad) * (L.fanCh / 2), y: pc.y - Math.cos(rad) * (L.fanCh / 2) };
    setMode('pick');
    setSlot(chosen);
    const f = facingRef.current;
    await flyTo(top.x - 0.32 * L.S * f, top.y - 0.05 * L.S, 260);
    await wait(140);
    // carry it to centre stage; the other cards fade away
    setMode('fly');
    const centre = { x: L.w / 2, y: L.h * 0.42 };
    const carryScale = L.fanScale * 1.25;
    const carryH = L.ch * carryScale;
    const dir: 1 | -1 = centre.x < pc.x - 10 ? -1 : centre.x > pc.x + 10 ? 1 : f;
    face(dir);
    cards.forEach((c, i) => {
      if (i === chosen) return;
      c.opacity.value = withTiming(0, { duration: 500 });
      c.y.value = withTiming(fan[i].y + 40, { duration: 500 });
    });
    const k = cards[chosen];
    const mTarget = { x: centre.x - 0.34 * L.S * dir, y: centre.y - carryH / 2 + 0.06 * L.S };
    k.x.value = withTiming(centre.x, { duration: 800, easing: EASE });
    k.y.value = withTiming(centre.y, { duration: 800, easing: EASE });
    k.scale.value = withTiming(carryScale, { duration: 800 });
    k.rot.value = withSequence(withTiming(-pc.rot * 0.5 - 6, { duration: 300 }), withTiming(5, { duration: 250 }), withTiming(0, { duration: 250 }));
    await flyTo(mTarget.x, mTarget.y, 800);
    // let go: Mittu flies up, the card floats to its place and flips
    play('whoosh', 0.35);
    setMode('fly');
    flyTo(L.w * 0.84, L.h * 0.14, 600).catch(() => {});
    k.x.value = withTiming(L.final.x, { duration: 750, easing: Easing.out(Easing.cubic) });
    k.y.value = withSequence(withTiming(centre.y + 14, { duration: 160 }), withTiming(L.final.y, { duration: 750, easing: Easing.out(Easing.cubic) }));
    k.scale.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    await wait(920);
    k.flip.value = withTiming(180, { duration: 900, easing: Easing.bezier(0.45, 0, 0.2, 1) });
    await wait(430);
    setBurst(Date.now());
    play('chime', 0.9);
    dim.value = withTiming(0.6, { duration: 900 });
    await wait(470);
    // 11) Mittu lands on the rod beside the card
    setPerched(true);
    setMode('fly');
    face(L.land.x < mx.value ? -1 : 1);
    mx.value = withTiming(L.land.x, { duration: 700, easing: Easing.out(Easing.cubic) });
    my.value = withSequence(withTiming(L.land.y - 30, { duration: 450 }), withTiming(L.land.y, { duration: 250 }));
    mscale.value = withTiming(0.85, { duration: 700 });
    await wait(700);
    flaps(null);
    face(-1);
    setMode('land');
    play('flap', 0.35);
    await wait(250);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, wait, face]);

  // ---------------------------------------------------------------- start
  useEffect(() => {
    if (!input) {
      router.replace('/');
      return;
    }
    track('reading_started', { category: input.category });
    resultRef.current = askMittu(input.question, input.category);
    resultRef.current.catch((e: ApiError) => {
      setError(e.status === 402 ? 'Aapka plan active nahi hai.' : e.message);
    });
    const off = onMuteChange(setMutedState);
    const R = run.current;
    return () => {
      R.cancelled = true;
      R.timers.forEach(clearTimeout);
      clearInterval(R.flaps);
      stopSpeech.current?.();
      stopVoice();
      stopAmbient();
      off();
    };
  }, [input]);

  useEffect(() => {
    if (!L || !resultRef.current) return;
    mx.value = L.perch.x;
    my.value = L.perch.y;
    cards.forEach((c) => { c.x.value = L.w / 2; c.y.value = L.h * 0.45; c.scale.value = L.fanScale * 0.6; });
    const chosen = Math.floor(Math.random() * FAN);
    chosenRef.current = chosen;
    (async () => {
      await initSound();
      const skip = reducedMotion || (await getSkipAnimation());
      try {
        if (skip) {
          track('reading_skipped_animation', { reason: reducedMotion ? 'reduced_motion' : 'setting' });
          startAmbient();
          const r = await resultRef.current!;
          if (r.kind !== 'reading') return showMessage(r);
          setSlot(chosen);
          placeFinal(chosen);
          play('chime', 0.8);
          reveal(r, chosen);
        } else {
          const r = await cinematic(chosen);
          if (r && r.kind !== 'reading') return showMessage(r);
          if (r) reveal(r, chosen);
        }
      } catch (e) {
        if (e !== CANCEL) showMessage(null);   // API error: `error` holds the message
      }
    })();
    // Runs once, when the scene has its size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L !== null]);

  function showMessage(r: ReadingResult | null) {
    run.current.timers.forEach(clearTimeout);
    flaps(null);
    setFlute(false);
    setPerched(false);
    if (r) setResult(r);
    setPhase('message');
    cards.forEach((c) => { c.opacity.value = withTiming(0, { duration: 400 }); });
    if (L) {
      setMode('fly');
      flyTo(L.perch.x, L.perch.y, 900).then(() => setMode('idle')).catch(() => {});
    }
  }

  async function skip() {
    if (!run.current || phase !== 'intro' || run.current.cancelled) return;
    track('reading_skipped_animation', { reason: 'button' });
    const R = run.current;
    R.cancelled = true;
    R.timers.forEach(clearTimeout);
    flaps(null);
    setFeathers([]);
    setFlute(false);
    const r = await resultRef.current!.catch(() => null);
    if (!r || r.kind !== 'reading') return showMessage(r);
    const chosen = chosenRef.current;
    setSlot(chosen);
    placeFinal(chosen);
    play('chime', 0.7);
    setBurst(Date.now());
    reveal(r, chosen);
  }

  async function share(r: Reading) {
    const message = `🦜 Mittu ne mere liye ${r.card.name} (${r.card.hindi}) ka card nikaala!\n\n${r.text}\n\n— Mittu AI · Sirf manoranjan ke liye`;
    track('reading_shared', { card: r.card.id });
    try {
      await Share.share({ message });
    } catch {
      // Browsers without a share sheet: copy instead.
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }, () => {});
      }
    }
  }

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const reading = result?.kind === 'reading' ? result : null;
  const words = useMemo(() => (reading ? reading.text.split(/\s+/) : []), [reading]);
  const lucky = useMemo(() => (reading ? luckyOf(reading.text) : { color: null, number: null }), [reading]);
  const still = !!reducedMotion;

  return (
    <View style={{ flex: 1, backgroundColor: scene.night }} onLayout={(e) => {
      const { width, height } = e.nativeEvent.layout;
      if (!size) setSize({ w: width, h: height });
    }}>
      {L ? (
        <>
          <NightBackdrop width={L.w} height={L.h} mandalaY={L.final.y} still={still} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,3,20,0.55)' }, dimStyle]} />
          <Perch x={L.perch.x} rodY={L.rodY} />
          {cards.map((c, i) => (
            <SceneCard key={i} m={c} L={L} z={i === slot && phase !== 'intro' ? 22 : 10 + (i >= 3 ? 2 : 0) + (i === slot ? 5 : 0)}>
              <FlipCard card={i === slot && reading ? reading.card : null} reversed={reading?.orientation === 'reversed'} width={L.cw} flip={c.flip} />
            </SceneCard>
          ))}
          {feathers.map((f) => <Feather key={f.id} x={f.x} y={f.y} dir={f.dir} />)}
          <MittuActor x={mx} y={my} rot={mrot} scale={mscale} L={L} mode={mode} facing={facing} talking={talking} still={still} />
          <Rod x1={L.rod.x1} x2={L.rod.x2} y={L.rod.y} visible={perched} />
          {burst ? <Swirl key={`s${burst}`} x={L.final.x} y={L.final.y} width={L.cw} /> : null}
          {burst ? <Burst key={burst} seed={burst} x={L.final.x} y={L.final.y} radius={L.cw * 0.9} /> : null}
          <Vignette width={L.w} height={L.h} />
          {flute ? <FluteZoom width={L.w} height={L.h} /> : null}

          {phase === 'intro' && !error ? (
            <View pointerEvents="none" style={[styles.status, { bottom: insets.bottom + 24 }]}>
              <Text style={[type.subhead, { color: 'rgba(246,238,219,0.7)', textAlign: 'center' }]}>Mittu card chun raha hai…</Text>
            </View>
          ) : null}

          {phase === 'revealed' && reading ? (
            <ScrollView style={{ position: 'absolute', left: 0, right: 0, top: L.panelTop, bottom: 0, zIndex: 35 }}
              contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.lg }}>
              <Text style={styles.caption}>Suno suno… Mittu ne nikaala hai {reading.card.hindi} ka card!</Text>
              {speaking ? (
                <>
                  <Subtitles words={words} current={wordIdx} />
                  <Pressable accessibilityRole="button" onPress={() => { stopSpeech.current?.(); stopVoice(); }} style={[styles.ghostBtn, { flex: 0 }]}>
                    <Ionicons name="stop" size={17} color={scene.goldSoft} />
                    <Text style={styles.ghostText}>Roko, result dikhao</Text>
                  </Pressable>
                </>
              ) : (
                <Parchment>
                  <Text style={styles.scrollTitle}>Aapka result</Text>
                  <Flourish />
                  <Text style={styles.scrollCard}>
                    {reading.card.name} · {reading.card.hindi}{reading.orientation === 'reversed' ? ' (Ulta)' : ''}
                  </Text>
                  <Text style={{ color: ink.text, fontSize: 15.5, lineHeight: 23, marginTop: space.sm }}>{reading.text}</Text>
                  {lucky.color || lucky.number ? (
                    <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
                      {lucky.color ? (
                        <View style={styles.luckyBox}><Text style={styles.luckyLabel}>Lucky colour</Text><Text style={styles.luckyValue}>{lucky.color}</Text></View>
                      ) : null}
                      {lucky.number ? (
                        <View style={styles.luckyBox}><Text style={styles.luckyLabel}>Lucky number</Text><Text style={styles.luckyValue}>{lucky.number}</Text></View>
                      ) : null}
                    </View>
                  ) : null}
                  <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.scrollBtn, { backgroundColor: scene.gold, borderColor: '#9A7420', marginTop: space.lg }]}>
                    <Ionicons name="sparkles" size={17} color="#1B1240" />
                    <Text style={[styles.ghostText, { color: '#1B1240' }]}>Ek aur card</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => void share(reading)} style={styles.scrollBtn}>
                    <Ionicons name="share-social-outline" size={17} color={scene.goldSoft} />
                    <Text style={styles.ghostText}>{copied ? 'Copy ho gaya!' : 'Share Karo'}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => void speak(reading)} style={styles.scrollBtn}>
                    <Ionicons name="refresh" size={17} color={scene.goldSoft} />
                    <Text style={styles.ghostText}>Replay Voice</Text>
                  </Pressable>
                  <ReadingFooter color={ink.soft} onReport={() => setReportId(reading.id)} />
                </Parchment>
              )}
            </ScrollView>
          ) : null}

          {phase === 'message' ? (
            <View style={[styles.messageWrap, { top: L.h * 0.18, paddingBottom: insets.bottom }]}>
              <View style={styles.textBox}>
                <Text style={{ color: scene.text, fontSize: 16, lineHeight: 24 }}>{error ?? (result && 'text' in result ? result.text : '')}</Text>
                {result?.kind === 'support' ? (
                  <View style={{ gap: space.sm, marginTop: space.md }}>
                    {result.helplines.map((h) => (
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
              {phase === 'intro' && !error && !still ? (
                <Pressable accessibilityRole="button" onPress={skip} style={[styles.round, { width: undefined, paddingHorizontal: 14 }]}>
                  <Text style={styles.ghostText}>Skip animation</Text>
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
  round: { height: 40, minWidth: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(30,20,70,0.7)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)' },
  status: { position: 'absolute', left: 0, right: 0 },
  caption: { fontFamily: serif, color: scene.goldSoft, textAlign: 'center', fontSize: 20, lineHeight: 27, fontWeight: '700', marginBottom: space.md,
    textShadowColor: 'rgba(212,175,55,0.55)', textShadowRadius: 10 },
  scrollTitle: { fontFamily: serif, color: ink.text, textAlign: 'center', fontSize: 24, fontWeight: '700' },
  scrollCard: { fontFamily: serif, color: ink.gold, textAlign: 'center', fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
  luckyBox: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(154,116,32,0.5)', backgroundColor: 'rgba(255,248,225,0.45)' },
  luckyLabel: { color: ink.soft, fontSize: 12, letterSpacing: 0.4 },
  luckyValue: { fontFamily: serif, color: ink.text, fontSize: 17, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  scrollBtn: { height: 48, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.sm,
    backgroundColor: '#1E1650', borderWidth: 1, borderColor: 'rgba(212,175,55,0.6)' },
  subs: { borderRadius: 16, paddingHorizontal: space.lg, paddingVertical: space.md, marginBottom: space.md,
    backgroundColor: 'rgba(14,9,40,0.92)', borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.75)', minHeight: 52, justifyContent: 'center' },
  textBox: { borderRadius: 16, padding: space.lg, backgroundColor: 'rgba(20,13,58,0.85)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)' },
  ghostBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.6)' },
  ghostText: { color: scene.goldSoft, fontSize: 15, fontWeight: '600' },
  messageWrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 40 },
});
