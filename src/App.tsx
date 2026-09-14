import { useState, useEffect, useRef } from "react";
import VRVideoPlayer from "./VRVideoPlayer";
import Hls from "hls.js";

// Creates an Audio element with HLS support if needed
function createAudio(src: string, volume: number, loop = true): { audio: HTMLAudioElement; hls: Hls | null } {
  const audio = new Audio();
  audio.loop = loop;
  audio.volume = volume;
  let hls: Hls | null = null;
  if (src.includes(".m3u8") && Hls.isSupported()) {
    hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    hls.loadSource(src);
    hls.attachMedia(audio);
  } else {
    audio.src = src;
  }
  return { audio, hls };
}

function destroyAudio(audio: HTMLAudioElement | null, hls: Hls | null) {
  if (!audio) return;
  audio.pause();
  if (hls) { hls.destroy(); }
  audio.src = "";
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | "splash-uis"
  | "splash-app"
  | "main-menu"
  | "bantuan"
  | "tentang-kami"
  | "quiz"
  | "recommendation"
  | "location-picker"
  | "vr-world"
  | "assessment"
  | "guided-intro"
  | "session"
  | "audio-library"
  | "lobby";

type BurnoutLevel = "Sederhana" | "Tinggi" | "Kritikal";
type AudioTab = "quran" | "dhikr";

interface AudioTrack {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  src: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const QURAN_TRACKS: AudioTrack[] = [
  { id: "q1", title: "Surah Ar-Rahman", subtitle: "Irama Ketenangan", duration: "--:--", src: "https://stream.mux.com/MQeRkpVvdAF02io6XfgLBk4q02b3fgUM5hx1fpyH5NOUg.m3u8" },
  { id: "q2", title: "Surah Ad-Duha & Asy-Syarh", subtitle: "Pelega Keresahan", duration: "--:--", src: "https://stream.mux.com/lbZ00vfmRmrUtrFF63Earun0001vbULQApopxjbCuhqqVE.m3u8" },
  { id: "q3", title: "Surah Al-Mulk", subtitle: "Keagungan Ciptaan", duration: "--:--", src: "https://stream.mux.com/h2S3LIESAlM01Ou3lK3nKNT6Ov01qF01uVcop7I021ZFMu8.m3u8" },
  { id: "q4", title: "Surah Al-Kahf", subtitle: "Cahaya Hati", duration: "--:--", src: "https://stream.mux.com/hfgVvhxinEAat01MShaEqkYBgMSj1FebIdQ3jofL8VYk.m3u8" },
  { id: "q5", title: "Surah Maryam", subtitle: "Penyejuk Jiwa", duration: "--:--", src: "https://stream.mux.com/E1P3XaWh1SEEBafidpw01aOZuORw4028uLUwL4e8j02Dr00.m3u8" },
];

const DHIKR_TRACKS: AudioTrack[] = [
  { id: "d1", title: "Istighfar Munajat", subtitle: "Sayyidul Istighfar", duration: "--:--", src: "https://stream.mux.com/c6NA02EFpUnGkh6pSn004eFTOptBTx1ryztVBBC016701mw.m3u8" },
  { id: "d2", title: "Tasbih & Tahmid", subtitle: "Subhanallah wa Bihamdihi", duration: "--:--", src: "https://stream.mux.com/MvTIFUV4MpIWTFeQJo7cGqEi1cHALQfVOjx012J003zyc.m3u8" },
  { id: "d3", title: "Hauqalah & Hasbunallah", subtitle: "Penyerahan Diri", duration: "--:--", src: "https://stream.mux.com/VYShdFVFp52afbdvVpAgyKHL3bCt2qvMng5lKViZU5o.m3u8" },
  { id: "d4", title: "Salawat Syifa", subtitle: "Ketenangan Jiwa", duration: "--:--", src: "https://stream.mux.com/mMMByUhkx2jayF4kSgfPqSJr02qEEpNIgScyO9hNp5AM.m3u8" },
  { id: "d5", title: "Asmaul Husna", subtitle: "Al-Salam, Al-Mu'min, Al-Latif", duration: "--:--", src: "https://stream.mux.com/DQvHN6M2Gd4Ek3NxQ9NjPxw501YyHkXZ63Kb4Z5a1KHU.m3u8" },
];

const BURNOUT_LEVELS: { level: BurnoutLevel; score: number; color: string; desc: string }[] = [
  { level: "Sederhana", score: 42, color: "#d4a843", desc: "Anda memerlukan masa untuk berehat dan merenung." },
  { level: "Tinggi", score: 67, color: "#f97316", desc: "Tahap tekanan anda memerlukan perhatian segera." },
  { level: "Kritikal", score: 85, color: "#ef4444", desc: "Diperlukan sesi pemulihan mendalam." },
];

const BEACH_IMAGE = "https://images.unsplash.com/photo-1573789369817-664f2075bd95?w=800&h=500&fit=crop&auto=format";

// ─── Components ───────────────────────────────────────────────────────────────

function WaveformIcon({ playing = true, bars = 12, color = "#10b981" }: { playing?: boolean; bars?: number; color?: string }) {
  return (
    <div className="flex items-center gap-[3px]" style={{ height: 32 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 3,
            background: color,
            height: playing ? undefined : 4,
            animationName: playing ? "waveform" : "none",
            animationDuration: `${0.5 + (i % 5) * 0.1}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDelay: `${i * 0.06}s`,
            display: "inline-block",
            borderRadius: 2,
            alignSelf: "center",
          }}
        />
      ))}
    </div>
  );
}

function StarField() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.6 + 0.2,
    delay: Math.random() * 3,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animation: `pulse-glow ${2 + s.delay}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── UIS Crest SVG ────────────────────────────────────────────────────────────
function UISCrest({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield outline */}
      <path
        d="M60 8 L100 24 L100 64 C100 88 82 104 60 112 C38 104 20 88 20 64 L20 24 Z"
        fill="rgba(18,22,26,0.8)"
        stroke="url(#shieldGrad)"
        strokeWidth="2"
      />
      {/* Crescent moon */}
      <path
        d="M72 38 A18 18 0 1 1 48 56 A12 12 0 0 0 72 38 Z"
        fill="url(#goldGrad)"
      />
      {/* Five-pointed star */}
      <path
        d="M60 42 L62.4 49.2 L70 49.2 L64 53.6 L66.4 60.8 L60 56.4 L53.6 60.8 L56 53.6 L50 49.2 L57.6 49.2 Z"
        fill="#d4a843"
        opacity="0.9"
      />
      {/* Bottom banner */}
      <rect x="28" y="88" width="64" height="12" rx="2" fill="url(#bannerGrad)" opacity="0.9"/>
      <text x="60" y="97.5" textAnchor="middle" fontSize="6" fontFamily="serif" fontWeight="700" fill="#050d1a" letterSpacing="1">
        UNIVERSITI ISLAM SELANGOR
      </text>
      {/* Top arch text */}
      <path id="arch" d="M 32 60 A 28 28 0 0 1 88 60" fill="none"/>
      <text fontSize="5" fontFamily="serif" fill="rgba(212,168,67,0.8)" letterSpacing="2">
        <textPath href="#arch" startOffset="8%">ILMU  ·  AMAL  ·  AKHLAK</textPath>
      </text>
      <defs>
        <linearGradient id="shieldGrad" x1="20" y1="8" x2="100" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d4a843"/>
          <stop offset="100%" stopColor="#10b981"/>
        </linearGradient>
        <linearGradient id="goldGrad" x1="48" y1="30" x2="80" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0c866"/>
          <stop offset="100%" stopColor="#d4a843"/>
        </linearGradient>
        <linearGradient id="bannerGrad" x1="28" y1="88" x2="92" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c8982a"/>
          <stop offset="100%" stopColor="#d4a843"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── TadabburVerse Logomark SVG ────────────────────────────────────────────────
function TadabburMark({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glowBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(16,185,129,0.18)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
        <linearGradient id="leafGrad" x1="20" y1="80" x2="80" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669"/>
          <stop offset="60%" stopColor="#10b981"/>
          <stop offset="100%" stopColor="#d4a843"/>
        </linearGradient>
        <linearGradient id="crescentGrad" x1="30" y1="20" x2="70" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0c866"/>
          <stop offset="100%" stopColor="#d4a843"/>
        </linearGradient>
        <filter id="leafGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Ambient glow bg */}
      <circle cx="50" cy="50" r="48" fill="url(#glowBg)"/>
      {/* Leaf body */}
      <path
        d="M28 72 C28 72 20 40 50 20 C80 40 72 72 50 80 C40 76 28 72 28 72 Z"
        fill="url(#leafGrad)"
        filter="url(#leafGlow)"
        opacity="0.92"
      />
      {/* Leaf vein */}
      <path d="M50 20 C50 20 48 50 42 72" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Crescent moon overlay */}
      <path
        d="M62 26 A20 20 0 1 1 42 44 A14 14 0 0 0 62 26 Z"
        fill="url(#crescentGrad)"
        opacity="0.95"
      />
      {/* VR wavelines */}
      <path d="M18 82 Q30 76 42 82 Q54 88 66 82 Q78 76 90 82" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M22 88 Q34 83 46 88 Q58 93 70 88 Q82 83 90 88" stroke="rgba(16,185,129,0.3)" strokeWidth="1" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Splash Screen A — UIS ────────────────────────────────────────────────────
function SplashUIS({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 1500);
    const t2 = setTimeout(() => setPhase("out"), 2500);
    const t3 = setTimeout(onNext, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onNext]);

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: "radial-gradient(ellipse at center, #1a1f26 0%, #12161a 60%, #0a0d10 100%)",
        opacity: phase === "in" ? 0 : phase === "out" ? 0 : 1,
        transition: phase === "in" ? "opacity 1.5s ease-in" : phase === "out" ? "opacity 1.1s ease-out" : "none",
      }}
      onClick={onNext}
    >
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)"
      }}/>
      {/* Subtle grid lines — spatial VR feel */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}/>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8">
        {/* Outer glow ring */}
        <div className="relative flex items-center justify-center">
          <div className="absolute rounded-full animate-pulse-glow" style={{
            width: 160, height: 160,
            background: "radial-gradient(circle, rgba(212,168,67,0.12) 0%, transparent 70%)",
          }}/>
          <div className="rounded-full p-5 flex items-center justify-center" style={{
            background: "rgba(18,22,26,0.9)",
            border: "1px solid rgba(212,168,67,0.35)",
            boxShadow: "0 0 40px rgba(212,168,67,0.2), inset 0 0 30px rgba(0,0,0,0.5)",
            width: 148, height: 148,
          }}>
            <img
              src="/logo-uis.png"
              alt="Logo Universiti Islam Selangor"
              width={108}
              height={108}
              style={{ objectFit: "contain" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty("display", "block");
              }}
            />
            <span style={{ display: "none" }}><UISCrest size={108}/></span>
          </div>
        </div>

        {/* Institution name */}
        <div>
          <p className="font-display text-xs tracking-[0.35em] text-amber-400/70 uppercase mb-2">
            Universiti Islam Selangor
          </p>
          <div className="h-px w-40 mx-auto mb-3" style={{ background: "linear-gradient(90deg, transparent, rgba(212,168,67,0.5), transparent)" }}/>
          <p className="text-slate-400 text-sm tracking-wider" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Inovasi Kesejahteraan Holistik
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-1.5 mt-4">
          {[0,1,2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400/50"
              style={{ animation: `pulse-glow 1.2s ease-in-out ${i * 0.2}s infinite` }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Splash Screen B — TadabburVerse ─────────────────────────────────────────
function SplashApp({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [ringScale, setRingScale] = useState(0.6);

  useEffect(() => {
    const t0 = setTimeout(() => setRingScale(1), 100);
    const t1 = setTimeout(() => setPhase("hold"), 1800);
    const t2 = setTimeout(() => setPhase("out"), 3200);
    const t3 = setTimeout(onNext, 4200);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onNext]);

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #0f2744 0%, #071525 50%, #050d1a 100%)",
        opacity: phase === "in" ? 0 : phase === "out" ? 0 : 1,
        transition: phase === "in" ? "opacity 1.8s ease-in" : phase === "out" ? "opacity 1s ease-out" : "none",
      }}
      onClick={onNext}
    >
      <StarField />
      {/* Ambient emerald bloom */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 45%, rgba(16,185,129,0.1) 0%, transparent 55%)",
      }}/>

      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-8">
        {/* Concentric glow rings */}
        <div className="relative flex items-center justify-center mb-2">
          {[1.8, 1.4, 1.0].map((scale, i) => (
            <div key={i} className="absolute rounded-full" style={{
              width: 160 * scale * ringScale,
              height: 160 * scale * ringScale,
              border: `1px solid rgba(16,185,129,${0.06 + i * 0.06})`,
              transition: `all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.1}s`,
              boxShadow: i === 2 ? "0 0 30px rgba(16,185,129,0.15)" : "none",
            }}/>
          ))}
          {/* Logo container */}
          <div className="relative rounded-full flex items-center justify-center" style={{
            width: 140,
            height: 140,
            background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(5,13,26,0.9) 70%)",
            border: "1.5px solid rgba(16,185,129,0.4)",
            boxShadow: "0 0 60px rgba(16,185,129,0.25), inset 0 0 40px rgba(16,185,129,0.05)",
            transform: `scale(${ringScale})`,
            transition: "transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}>
            <img
              src="/logo-tadabburverse.png"
              alt="Logo TadabburVerse"
              width={88}
              height={88}
              style={{ objectFit: "contain" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty("display", "block");
              }}
            />
            <span style={{ display: "none" }}><TadabburMark size={88}/></span>
          </div>
        </div>

        {/* App name */}
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-1" style={{
            background: "linear-gradient(135deg, #e8f5f0 0%, #10b981 40%, #d4a843 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.01em",
          }}>
            TadabburVerse
          </h1>
          <div className="h-px w-48 mx-auto my-3" style={{
            background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.6), rgba(212,168,67,0.6), transparent)"
          }}/>
          <p className="text-slate-300/80 text-sm tracking-[0.12em]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Rehatkan Minda, Hayati Ciptaan-Nya
          </p>
          <p className="text-slate-500 text-xs mt-1 tracking-widest">
            REST THE MIND · CONTEMPLATE HIS CREATION
          </p>
        </div>

        {/* VR indicator */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full mt-3" style={{
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.2)",
        }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          <span className="text-emerald-400/70 text-xs tracking-widest uppercase">VR Spatial Experience</span>
        </div>
      </div>
    </div>
  );
}

// ─── Bantuan Screen ───────────────────────────────────────────────────────────
function BantuanScreen({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: "🧠",
      step: "01",
      title: "Ujian Saringan Stres",
      desc: "Mulakan dengan menjawab 3 soalan mudah untuk menilai tahap tekanan mental anda. Jawapan anda menentukan dunia VR yang paling sesuai untuk sesi tadabbur.",
    },
    {
      icon: "🌍",
      step: "02",
      title: "Pilih Dunia VR",
      desc: "Sistem akan mencadangkan dunia VR berdasarkan skor ujian anda — Pantai Redang untuk ketenangan, Air Terjun Kanching untuk pelepasan ketegangan. Anda juga boleh memilih lokasi secara manual.",
    },
    {
      icon: "🎧",
      step: "03",
      title: "Masuk ke Ruang Tadabbur",
      desc: "Pakai headset VR anda dan ikuti panduan audio voiceover selama 25 saat. Dengar arahan sebelum menekan butang \"Faham & Mula Tadabbur\".",
    },
    {
      icon: "🌬️",
      step: "04",
      title: "Ikuti Ritma Nafas",
      desc: "Semasa sesi berlangsung, ikuti animasi bulatan nafas di bahagian atas skrin — Tarik Nafas semasa bulatan membesar, Hembus Nafas semasa ia mengecil.",
    },
    {
      icon: "🎵",
      step: "05",
      title: "Laras Audio",
      desc: "Gunakan panel media terapung di bahagian bawah untuk melaras kelantangan Bunyi Alam dan Zikir & Bacaan Quran. Tekan \"Tukar Audio\" untuk memilih surah atau zikir lain.",
    },
    {
      icon: "🚪",
      step: "06",
      title: "Tamat Sesi",
      desc: "Tekan butang \"Exit\" di sudut kiri atas pada bila-bila masa untuk keluar. Sahkan pilihan anda pada modal keselamatan yang terpapar untuk kembali ke Lobi Utama.",
    },
  ];

  return (
    <div className="relative min-h-screen star-bg flex flex-col overflow-hidden">
      <StarField />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2" style={{
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.25)",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <span className="text-emerald-400 text-[10px] tracking-widest uppercase">Panduan Penggunaan</span>
          </div>
          <h1 className="font-display text-2xl text-white">Bantuan</h1>
          <p className="text-slate-500 text-xs mt-0.5">How to navigate TadabburVerse</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-slate-300 transition-all hover:scale-105"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Tutup
        </button>
      </div>

      {/* Steps */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-10 flex flex-col gap-4">
        {steps.map((s, i) => (
          <div
            key={s.step}
            className="glass rounded-2xl p-5 flex gap-4 animate-fade-in"
            style={{
              border: "1px solid rgba(16,185,129,0.14)",
              animationDelay: `${i * 0.08}s`,
            }}
          >
            {/* Step number + icon */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                {s.icon}
              </div>
              <span className="font-mono text-[10px] font-bold" style={{ color: "rgba(16,185,129,0.5)" }}>{s.step}</span>
              {i < steps.length - 1 && (
                <div className="w-px flex-1 mt-1" style={{ background: "rgba(16,185,129,0.12)", minHeight: 16 }}/>
              )}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-white font-semibold text-sm mb-1.5">{s.title}</p>
              <p className="text-slate-400 text-xs leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}

        {/* Close CTA at bottom */}
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base mt-2 transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 0 28px rgba(16,185,129,0.4)" }}
        >
          Kembali ke Lobi Utama
          <span className="block text-xs opacity-70 font-normal mt-0.5">Back to Main Lobby</span>
        </button>
      </div>
    </div>
  );
}

// ─── Tentang Kami Screen ───────────────────────────────────────────────────────
function TentangKamiScreen({ onClose }: { onClose: () => void }) {
  const researchers = [
    { index: "i",   name: "Nur Muizz Mohamed Salleh",    faculty: "FMKK, UIS" },
    { index: "ii",  name: "Muhammad Farhan Fauzan Masaat", faculty: "FMKK, UIS" },
    { index: "iii", name: "Nur Aisya Insyira Manaf",       faculty: "FMKK, UIS" },
    { index: "iv",  name: "Hasrol Basir",                  faculty: "FP, UIS"   },
    { index: "v",   name: "Dr Nur Sukinah Aziz",           faculty: "TATIUC"    },
  ];

  return (
    <div className="relative min-h-screen star-bg flex flex-col overflow-hidden">
      <StarField />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2" style={{
            background: "rgba(212,168,67,0.1)",
            border: "1px solid rgba(212,168,67,0.25)",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-amber-400 text-[10px] tracking-widest uppercase">Penyelidikan GPIU 2025</span>
          </div>
          <h1 className="font-display text-2xl text-white">Tentang Kami</h1>
          <p className="text-slate-500 text-xs mt-0.5">About this project</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-slate-300 transition-all hover:scale-105"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Tutup
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-10 flex flex-col gap-5">

        {/* UIS crest + grant info card */}
        <div className="glass rounded-2xl p-6 animate-fade-in" style={{ border: "1px solid rgba(212,168,67,0.2)" }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)" }}>
              <UISCrest size={44}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">Universiti Islam Selangor</p>
              <p className="text-white font-display text-sm leading-snug">Geran Penyelidikan dan Inovasi Universiti Islam Selangor</p>
              <p className="text-slate-400 text-xs mt-1">GPIU 2025</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px mb-4" style={{ background: "rgba(212,168,67,0.15)" }}/>

          {/* Project description */}
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            Aplikasi TadabburVerse ini sebahagian daripada skim Geran Penyelidikan dan Inovasi Universiti Islam Selangor tahun 2025 (GPIU 2025) yang bertajuk:
          </p>
          <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)" }}>
            <p className="text-amber-200 text-sm font-medium leading-relaxed italic">
              "Aplikasi VR Tadabbur Alam dengan Pendekatan Islam untuk Mengurangkan Stres di Kalangan Pendidik di Malaysia"
            </p>
          </div>

          {/* Reference code */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest">Kod Rujukan</p>
              <p className="text-slate-200 text-xs font-mono mt-0.5">2025/P/GPIU/GPM-011</p>
            </div>
          </div>
        </div>

        {/* Researchers */}
        <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1" style={{ background: "rgba(16,185,129,0.2)" }}/>
            <span className="text-emerald-400 text-[10px] uppercase tracking-widest">Ahli Penyelidik</span>
            <div className="h-px flex-1" style={{ background: "rgba(16,185,129,0.2)" }}/>
          </div>

          <div className="flex flex-col gap-2.5">
            {researchers.map((r, i) => (
              <div
                key={r.index}
                className="flex items-center gap-4 p-4 rounded-xl glass animate-fade-in"
                style={{
                  border: "1px solid rgba(16,185,129,0.1)",
                  animationDelay: `${0.2 + i * 0.07}s`,
                }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>
                  {r.index}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-tight">{r.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{r.faculty}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Close CTA */}
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base mt-2 transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 0 28px rgba(16,185,129,0.4)" }}
        >
          Kembali ke Lobi Utama
          <span className="block text-xs opacity-70 font-normal mt-0.5">Back to Main Lobby</span>
        </button>
      </div>
    </div>
  );
}

// ─── Screen 3: Main Menu (Lobi Utama) ─────────────────────────────────────────
function MainMenuScreen({ onMula, onBantuan, onTentang, onKeluar }: {
  onMula: () => void;
  onBantuan: () => void;
  onTentang: () => void;
  onKeluar: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const CANOPY_URL = "https://images.unsplash.com/photo-1748935538554-572d3b82ba14?w=1600&h=900&fit=crop&auto=format";

  const buttons = [
    {
      id: "mula",
      label: "Mula",
      sublabel: "Begin Session",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.14v14l11-7-11-7z"/>
        </svg>
      ),
      variant: "primary" as const,
      action: onMula,
    },
    {
      id: "bantuan",
      label: "Bantuan",
      sublabel: "Help & Guide",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
        </svg>
      ),
      variant: "ghost" as const,
      action: onBantuan,
    },
    {
      id: "tentang",
      label: "Tentang Kami",
      sublabel: "About Us",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
      variant: "ghost" as const,
      action: onTentang,
    },
    {
      id: "keluar",
      label: "Keluar",
      sublabel: "Exit",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
      ),
      variant: "danger" as const,
      action: () => setShowExitConfirm(true),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      {/* Ambient nature canopy background */}
      <img
        src={CANOPY_URL}
        alt="Lush tropical forest canopy"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "brightness(0.18) saturate(0.7)", transform: "scale(1.05)" }}
      />
      {/* Dark vignette overlay */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, rgba(5,13,26,0.55) 0%, rgba(5,13,26,0.88) 100%)",
      }}/>
      {/* Emerald bloom center */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.07) 0%, transparent 60%)",
      }}/>
      <StarField />

      {/* Floating spatial panel */}
      <div className="relative z-10 w-full max-w-sm mx-4 animate-fade-in">
        {/* Top header — centred logo + title */}
        <div className="flex flex-col items-center justify-center px-5 py-5 rounded-t-2xl" style={{
          background: "rgba(5,13,26,0.7)",
          borderTop: "1px solid rgba(16,185,129,0.2)",
          borderLeft: "1px solid rgba(16,185,129,0.12)",
          borderRight: "1px solid rgba(16,185,129,0.12)",
          backdropFilter: "blur(20px)",
        }}>
          <TadabburMark size={48}/>
          <span className="font-display text-base text-white tracking-[0.18em] mt-2 uppercase">TadabburVerse</span>
        </div>

        {/* Main panel body */}
        <div style={{
          background: "rgba(10,20,38,0.82)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(16,185,129,0.18)",
          borderTop: "none",
          borderBottomLeftRadius: "1.25rem",
          borderBottomRightRadius: "1.25rem",
          boxShadow: "0 8px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(16,185,129,0.06) inset, 0 1px 0 rgba(16,185,129,0.15) inset",
        }}>
          {/* Panel header text */}
          <div className="text-center pt-8 pb-6 px-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.4))" }}/>
              <span className="text-emerald-400/80 text-[10px] tracking-[0.3em] uppercase">Lobi Utama</span>
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.4), transparent)" }}/>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Selamat datang ke ruang meditasi VR anda.<br/>
              <span className="text-slate-500">Welcome to your VR meditation space.</span>
            </p>
          </div>

          {/* Button stack */}
          <div className="flex flex-col gap-3 px-6 pb-8">
            {buttons.map((btn) => {
              const isHovered = hovered === btn.id;
              const styles = {
                primary: {
                  background: isHovered
                    ? "linear-gradient(135deg, #047857, #059669, #10b981)"
                    : "linear-gradient(135deg, #059669, #10b981)",
                  border: "1px solid rgba(16,185,129,0.5)",
                  color: "#fff",
                  boxShadow: isHovered
                    ? "0 0 40px rgba(16,185,129,0.6), 0 4px 24px rgba(16,185,129,0.3)"
                    : "0 0 24px rgba(16,185,129,0.35)",
                },
                ghost: {
                  background: isHovered ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: isHovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)",
                  boxShadow: "none",
                },
                danger: {
                  background: isHovered ? "rgba(239,68,68,0.1)" : "transparent",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: isHovered ? "#fca5a5" : "rgba(252,165,165,0.7)",
                  boxShadow: "none",
                },
              }[btn.variant];

              return (
                <button
                  key={btn.id}
                  onClick={btn.action}
                  onMouseEnter={() => setHovered(btn.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="relative w-full flex items-center gap-4 py-4 px-5 rounded-xl text-left overflow-hidden"
                  style={{
                    ...styles,
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isHovered ? "translateY(-1px) scale(1.01)" : "none",
                  }}
                >
                  {/* Shimmer on primary hover */}
                  {btn.variant === "primary" && isHovered && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                      background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)",
                    }}/>
                  )}
                  <span className="flex-shrink-0 opacity-90" style={{ color: styles.color }}>
                    {btn.icon}
                  </span>
                  <div className="flex-1">
                    <span className="font-semibold text-base block leading-tight" style={{ color: styles.color, fontFamily: "'Outfit', sans-serif" }}>
                      {btn.label}
                    </span>
                    <span className="text-[11px] opacity-50 tracking-wide" style={{ color: styles.color }}>
                      {btn.sublabel}
                    </span>
                  </div>
                  {btn.variant !== "danger" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ color: styles.color, opacity: 0.4 }}>
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="text-center pb-5">
            <p className="text-slate-600 text-[10px] tracking-widest uppercase">
              TadabburVerse Application · UIS · 2026
            </p>
          </div>
        </div>

        {/* Outer glow halo */}
        <div className="absolute -inset-1 rounded-2xl pointer-events-none -z-10" style={{
          background: "transparent",
          boxShadow: "0 0 80px rgba(16,185,129,0.08)",
        }}/>
      </div>

      {/* ── Exit Confirmation Modal ── */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-8"
          style={{ background: "rgba(5,13,26,0.82)", backdropFilter: "blur(16px)" }}>
          <div className="glass-dark rounded-3xl p-8 w-full max-w-xs animate-slide-up text-center"
            style={{ border: "1px solid rgba(239,68,68,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            {/* Icon */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </div>
            <h3 className="font-display text-lg text-white mb-3 leading-snug">
              Anda Pasti untuk Keluar<br/>dari Aplikasi ini?
            </h3>
            <p className="text-slate-400 text-xs mb-7 leading-relaxed">
              Sesi semasa akan ditamatkan dan anda akan keluar dari TadabburVerse.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.03]"
                style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 0 16px rgba(16,185,129,0.35)" }}
              >
                Tidak
              </button>
              <button
                onClick={onKeluar}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-red-300 transition-all hover:bg-red-900/20"
                style={{ border: "1px solid rgba(239,68,68,0.4)" }}
              >
                Ya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Screen 1: Assessment Results ─────────────────────────────────────────────
function AssessmentScreen({ onContinue, onChooseManual }: { onContinue: () => void; onChooseManual: () => void }) {
  const [countdown, setCountdown] = useState(5);
  const [counting, setCounting] = useState(false);
  const burnout = BURNOUT_LEVELS[1]; // "Tinggi" for demo
  const svgSize = 80;
  const r = 34;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    if (!counting) return;
    if (countdown === 0) { onContinue(); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [counting, countdown, onContinue]);

  const handleContinue = () => {
    setCounting(true);
  };

  return (
    <div className="relative min-h-screen star-bg flex flex-col items-center justify-center px-6 py-10 overflow-hidden">
      <StarField />

      {/* Status header */}
      <div className="relative z-10 animate-fade-in text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4"
          style={{ border: "1px solid rgba(16,185,129,0.3)" }}>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-sm font-medium tracking-widest uppercase">Assessment Complete</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-white mb-1">
          Mind Tranquility Exam Results
        </h1>
        <p className="text-slate-400 text-sm">Hasil Ujian Ketenangan Minda Anda</p>
      </div>

      {/* Diagnosis Card */}
      <div className="relative z-10 animate-fade-in w-full max-w-md mb-6" style={{ animationDelay: "0.15s" }}>
        <div className="glass rounded-2xl p-6" style={{ border: `1px solid ${burnout.color}40` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Burnout Level Detected</p>
              <p className="text-slate-300 text-xs">Aras Kelesuan Dikesan</p>
            </div>
            <div className="relative flex items-center justify-center" style={{ width: svgSize, height: svgSize }}>
              <svg width={svgSize} height={svgSize} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={svgSize / 2} cy={svgSize / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
                <circle
                  cx={svgSize / 2} cy={svgSize / 2} r={r}
                  fill="none" stroke={burnout.color} strokeWidth={6}
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - burnout.score / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1.5s ease-out", filter: `drop-shadow(0 0 6px ${burnout.color})` }}
                />
              </svg>
              <span className="absolute font-display text-lg font-bold" style={{ color: burnout.color }}>{burnout.score}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${burnout.color}15` }}>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: burnout.color, boxShadow: `0 0 8px ${burnout.color}` }} />
            <div>
              <span className="font-semibold text-sm" style={{ color: burnout.color }}>Level {burnout.level}</span>
              <p className="text-slate-300 text-xs mt-0.5">{burnout.desc}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended World */}
      <div className="relative z-10 animate-fade-in w-full max-w-md mb-8" style={{ animationDelay: "0.3s" }}>
        <p className="text-slate-400 text-xs uppercase tracking-widest text-center mb-3">Recommended World · Dunia Disyorkan</p>
        <div className="relative rounded-2xl overflow-hidden emerald-glow-border animate-pulse-glow">
          <img
            src={BEACH_IMAGE}
            alt="Redang Beach — clear turquoise waters and rocky island"
            className="w-full object-cover"
            style={{ height: 180 }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,13,26,0.9) 0%, transparent 60%)" }} />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 8px #10b981" }} />
              <span className="text-emerald-300 text-xs uppercase tracking-widest">Redang Beach Tranquility</span>
            </div>
            <p className="text-white font-display text-base">Ketenangan Pantai Redang</p>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="relative z-10 animate-fade-in w-full max-w-md flex flex-col gap-3" style={{ animationDelay: "0.45s" }}>
        <button
          onClick={handleContinue}
          className="relative w-full py-4 rounded-2xl font-semibold text-white text-base overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 0 30px rgba(16,185,129,0.4)" }}
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            <span>Continue In</span>
            {counting ? (
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.2)" }}>
                {countdown}
              </span>
            ) : (
              <span className="text-emerald-100 text-sm opacity-70">Teruskan Masuk</span>
            )}
          </span>
        </button>
        <button
          onClick={onChooseManual}
          className="w-full py-3.5 rounded-2xl font-medium text-emerald-300 text-sm transition-all duration-300 hover:bg-emerald-900/20"
          style={{ border: "1px solid rgba(16,185,129,0.35)" }}
        >
          Choose Another Location Manually
          <span className="block text-xs text-slate-500 mt-0.5">Pilih Lokasi Lain Secara Manual</span>
        </button>
      </div>
    </div>
  );
}

// ─── Screen 2: Guided Tadabbur Intro ──────────────────────────────────────────
function GuidedIntroScreen({ onStart }: { onStart: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const GUIDED_SRC = "https://stream.mux.com/7Yv23ZkHMmneAXro5z8U00OHTLJhvA02zmsYh3fgSBpeY.m3u8";
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("timeupdate", () => setElapsed(audio.currentTime));
    audio.addEventListener("ended", () => { setReady(true); setPlaying(false); });

    let hls: import("hls.js").default | null = null;
    if (GUIDED_SRC.includes(".m3u8") && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(GUIDED_SRC);
      hls.attachMedia(audio);
      hls.on(Hls.Events.ERROR, (_e: unknown, data: { fatal: boolean }) => {
        if (data.fatal) setMissing(true);
      });
    } else {
      audio.src = GUIDED_SRC;
      audio.addEventListener("error", () => setMissing(true));
    }

    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));

    return () => {
      audio.pause();
      if (hls) hls.destroy();
      audio.src = "";
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const cues = [
    { icon: "👁️", en: "Look around to appreciate the grandeur of nature", ms: "Lihat sekeliling untuk menghayati kebesaran alam" },
    { icon: "🎚️", en: "Adjust the balance of nature sounds & zikr", ms: "Laras imbangan bunyi alam & zikir" },
    { icon: "🌬️", en: "Take slow breaths following the visual rhythm", ms: "Ambil nafas perlahan mengikut ritma visual" },
  ];

  return (
    <div className="relative min-h-screen star-bg flex flex-col items-center justify-center px-6 py-10 overflow-hidden">
      <StarField />

      {/* Header */}
      <div className="relative z-10 animate-fade-in text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <WaveformIcon bars={16} />
          <h1 className="font-display text-2xl md:text-3xl text-white">Guided Tadabbur Session</h1>
          <WaveformIcon bars={16} />
        </div>
        <p className="text-slate-400 text-sm">Panduan Sesi Tadabbur</p>
      </div>

      {/* Waveform Playback Bar */}
      <div className="relative z-10 animate-fade-in w-full max-w-md mb-6 glass rounded-2xl p-5" style={{ animationDelay: "0.1s" }}>
        {missing ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <p className="text-red-400 text-xs text-center">Fail audio tidak ditemui —</p>
            <code className="text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded">stream.mux.com · guided-intro</code>
            <button
              onClick={() => { setMissing(false); setReady(true); }}
              className="text-slate-400 text-xs underline mt-1"
            >Teruskan tanpa audio</button>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 0 16px rgba(16,185,129,0.4)" }}
            >
              {playing ? (
                <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
              )}
            </button>
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>Voiceover Introduction</span>
                <span>{fmt(elapsed)} / {duration > 0 ? fmt(duration) : "--:--"}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg, #059669, #10b981)", boxShadow: "0 0 8px rgba(16,185,129,0.6)" }}
                />
              </div>
            </div>
            {playing && (
              <div className="flex items-center gap-0.5" style={{ height: 24 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.08}s`, height: 8 }} />
                ))}
              </div>
            )}
          </div>
        )}
        {ready && !missing && <p className="text-emerald-400 text-xs text-center">✓ Audio selesai — anda boleh teruskan</p>}
      </div>

      {/* Instruction Cues */}
      <div className="relative z-10 w-full max-w-md flex flex-col gap-3 mb-8">
        {cues.map((cue, i) => (
          <div
            key={i}
            className="animate-fade-in glass rounded-xl px-4 py-3 flex items-start gap-4"
            style={{ animationDelay: `${0.2 + i * 0.12}s` }}
          >
            <span className="text-2xl flex-shrink-0 mt-0.5">{cue.icon}</span>
            <div>
              <p className="text-white text-sm font-medium">{cue.en}</p>
              <p className="text-slate-500 text-xs mt-0.5">{cue.ms}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Start Button */}
      <div className="relative z-10 animate-fade-in w-full max-w-md" style={{ animationDelay: "0.6s" }}>
        <button
          onClick={ready ? onStart : undefined}
          disabled={!ready}
          className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-500"
          style={{
            background: ready
              ? "linear-gradient(135deg, #059669, #10b981)"
              : "rgba(255,255,255,0.06)",
            color: ready ? "#fff" : "rgba(255,255,255,0.3)",
            boxShadow: ready ? "0 0 30px rgba(16,185,129,0.5)" : "none",
            cursor: ready ? "pointer" : "not-allowed",
            border: ready ? "none" : "1px solid rgba(255,255,255,0.1)",
            transform: ready ? undefined : "none",
          }}
        >
          {ready ? "Understand & Start Tadabbur ✦" : "Awaiting audio completion…"}
          <span className="block text-xs opacity-70 mt-0.5">
            {ready ? "Faham & Mula Tadabbur" : "Faham & Mula Tadabbur — menunggu audio selesai"}
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Screen 3: Session ────────────────────────────────────────────────────────
function SessionScreen({
  onExit,
  onOpenLibrary,
  onBackToMenu,
  currentTrack,
  isPlaying,
  setIsPlaying,
  natureVol,
  setNatureVol,
  zikrVol,
  setZikrVol,
  worldKey,
  autoEnterXR = false,
  onXREntered,
}: {
  onExit: () => void;
  onOpenLibrary: () => void;
  onBackToMenu: () => void;
  currentTrack: AudioTrack;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  natureVol: number;
  setNatureVol: (v: number) => void;
  zikrVol: number;
  setZikrVol: (v: number) => void;
  worldKey: WorldKey;
  autoEnterXR?: boolean;
  onXREntered?: () => void;
}) {
  const [breathPhase, setBreathPhase] = useState<"in" | "out">("in");
  const [trackProgress, setTrackProgress] = useState(42);

  useEffect(() => {
    const t = setInterval(() => {
      setBreathPhase((p) => (p === "in" ? "out" : "in"));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => setTrackProgress((p) => Math.min(p + 0.5, 100)), 1000);
    return () => clearInterval(t);
  }, [isPlaying]);

  const sessionWorld = VR_WORLDS[worldKey];

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#050d1a" }}>
      {/* ── Live 360° VR video background ── */}
      <VRVideoPlayer
        videoSrc={sessionWorld.videoUrl}
        accentColor={sessionWorld.accentColor}
        autoRotateSpeed={0}
        fov={80}
        volume={sessionWorld.videoUrl.includes(".m3u8") ? natureVol / 100 : 0}
        autoEnterXR={autoEnterXR}
        onXREntered={onXREntered}
      />
      {/* HUD overlay gradients */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `linear-gradient(to bottom, ${sessionWorld.overlayFrom} 0%, transparent 20%, transparent 60%, ${sessionWorld.overlayTo} 100%)`,
      }}/>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 35%, rgba(5,13,26,0.45) 100%)",
      }}/>

      {/* Exit pill button */}
      <button
        onClick={onExit}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full glass transition-all hover:scale-105 animate-fade-in"
        style={{ border: "1px solid rgba(255,255,255,0.15)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
        <span className="text-sm text-slate-300">Exit</span>
      </button>

      {/* Breathing Visualizer — top-anchored, compact, non-blocking */}
      <div className="absolute top-0 left-0 right-0 z-40 flex justify-center pointer-events-none animate-fade-in" style={{ paddingTop: 80 }}>
        <div className="flex items-center gap-4 px-5 py-3 rounded-2xl"
          style={{
            background: "rgba(5,13,26,0.55)",
            border: "1px solid rgba(16,185,129,0.22)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}>

          {/* Animated orb with rings */}
          <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 48, height: 48 }}>
            {/* Outer expanding ring */}
            <div className="absolute rounded-full" style={{
              width: 48, height: 48,
              border: "1.5px solid rgba(16,185,129,0.5)",
              animation: "breathe-in 4s ease-in-out infinite",
            }}/>
            {/* Middle ring */}
            <div className="absolute rounded-full" style={{
              width: 36, height: 36,
              border: "1px solid rgba(16,185,129,0.3)",
              animation: "breathe-in 4s ease-in-out infinite",
              animationDelay: "0.3s",
            }}/>
            {/* Core glowing orb */}
            <div className="rounded-full" style={{
              width: 22,
              height: 22,
              background: "radial-gradient(circle, #10b981 0%, rgba(16,185,129,0.4) 100%)",
              boxShadow: "0 0 14px rgba(16,185,129,0.8), 0 0 28px rgba(16,185,129,0.3)",
              animation: "breathe-in 4s ease-in-out infinite",
              animationDelay: "0.15s",
            }}/>
          </div>

          {/* Divider */}
          <div className="w-px h-8 flex-shrink-0" style={{ background: "rgba(16,185,129,0.25)" }}/>

          {/* Phase label */}
          <div className="flex flex-col">
            <span className="font-display text-emerald-300 text-sm tracking-widest leading-tight">
              {breathPhase === "in" ? "Tarik Nafas" : "Hembus Nafas"}
            </span>
            <span className="text-emerald-500/60 text-[10px] mt-0.5 tracking-wider">
              {breathPhase === "in" ? "Breathe In..." : "Breathe Out..."}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-8 flex-shrink-0" style={{ background: "rgba(16,185,129,0.25)" }}/>

          {/* Live waveform */}
          <WaveformIcon bars={8} color="#10b981" playing />
        </div>
      </div>

      {/* Floating Curved Media Hub */}
      <div className="absolute bottom-0 left-0 right-0 z-40 animate-slide-up px-4 pb-4" style={{ animationDelay: "0.2s" }}>
        <div className="max-w-2xl mx-auto glass-dark rounded-3xl p-5"
          style={{ border: "1px solid rgba(16,185,129,0.2)", boxShadow: "0 -8px 40px rgba(0,0,0,0.6)" }}>

          {/* Volume Sliders */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { label: "Nature Sound Volume", ms: "Bunyi Alam", value: natureVol, onChange: setNatureVol, icon: "🌊" },
              { label: "Zikr & Quran Recitation", ms: "Zikir & Bacaan Quran", value: zikrVol, onChange: setZikrVol, icon: "📿" },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1">{s.icon} {s.ms}</span>
                  <span className="text-xs text-emerald-400 font-mono">{s.value}%</span>
                </div>
                <input
                  type="range" min={0} max={100} value={s.value}
                  onChange={(e) => s.onChange(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #10b981 ${s.value}%, rgba(255,255,255,0.1) ${s.value}%)`,
                    accentColor: "#10b981",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px mb-4" style={{ background: "rgba(16,185,129,0.15)" }} />

          {/* Current Track */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 0 16px rgba(16,185,129,0.4)" }}
            >
              {isPlaying ? (
                <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{currentTrack.title}</p>
              <p className="text-slate-400 text-xs truncate">{currentTrack.subtitle}</p>
              <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${trackProgress}%`, background: "linear-gradient(90deg, #059669, #d4a843)", transition: "width 1s linear" }}
                />
              </div>
            </div>
            {isPlaying && <WaveformIcon bars={8} />}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onOpenLibrary}
              className="py-2.5 rounded-xl text-sm font-medium text-emerald-300 transition-all hover:scale-[1.02]"
              style={{ border: "1px solid rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.08)" }}
            >
              🎵 Change Audio
            </button>
            <button
              onClick={onBackToMenu}
              className="py-2.5 rounded-xl text-sm font-medium text-slate-300 transition-all hover:scale-[1.02]"
              style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
            >
              ← Back to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Audio Library Panel ───────────────────────────────────────────────────────
function AudioLibraryPanel({
  onClose,
  selectedId,
  onSave,
}: {
  onClose: () => void;
  selectedId: string;
  onSave: (track: AudioTrack) => void;
}) {
  const [tab, setTab] = useState<AudioTab>("quran");
  const [pending, setPending] = useState(selectedId);

  const tracks = tab === "quran" ? QURAN_TRACKS : DHIKR_TRACKS;

  const handleSave = () => {
    const all = [...QURAN_TRACKS, ...DHIKR_TRACKS];
    const t = all.find((x) => x.id === pending);
    if (t) onSave(t);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "rgba(5,13,26,0.92)", backdropFilter: "blur(20px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <div>
          <h2 className="font-display text-xl text-white">Audio Library</h2>
          <p className="text-slate-400 text-xs">Perpustakaan Audio</p>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center glass hover:scale-110 transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 mb-4">
        {([["quran", "Al-Quran & Tadabbur"], ["dhikr", "Tranquil Dhikr Melodies"]] as [AudioTab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab === t ? "linear-gradient(135deg, #059669, #10b981)" : "rgba(255,255,255,0.06)",
              color: tab === t ? "#fff" : "rgba(255,255,255,0.5)",
              boxShadow: tab === t ? "0 0 16px rgba(16,185,129,0.3)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-2">
        {tracks.map((track) => {
          const sel = pending === track.id;
          return (
            <button
              key={track.id}
              onClick={() => setPending(track.id)}
              className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{
                background: sel ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                border: sel ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{
                  border: sel ? "2px solid #10b981" : "2px solid rgba(255,255,255,0.2)",
                  background: sel ? "#10b981" : "transparent",
                }}
              >
                {sel && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{track.title}</p>
                <p className="text-slate-400 text-xs">{track.subtitle}</p>
              </div>
              <span className="text-slate-500 text-xs font-mono">{track.duration}</span>
            </button>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="px-6 py-6">
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 0 30px rgba(16,185,129,0.4)" }}
        >
          Save & Play ✦
          <span className="block text-xs opacity-70 mt-0.5">Simpan & Mainkan</span>
        </button>
      </div>
    </div>
  );
}

// ─── Exit Modal ────────────────────────────────────────────────────────────────
function ExitModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "rgba(5,13,26,0.75)", backdropFilter: "blur(12px)" }}>
      <div className="glass-dark rounded-3xl p-8 w-full max-w-sm animate-slide-up text-center"
        style={{ border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </div>
        <h3 className="font-display text-xl text-white mb-2">End Session?</h3>
        <p className="text-slate-300 text-sm leading-relaxed mb-1">
          End this tadabbur session and return to the main lobby?
        </p>
        <p className="text-slate-500 text-xs mb-7">
          Tamatkan sesi tadabbur ini dan kembali ke lobi utama?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onCancel}
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}
          >
            Continue Here
            <span className="block text-xs opacity-70 font-normal mt-0.5">Teruskan di Sini</span>
          </button>
          <button
            onClick={onConfirm}
            className="w-full py-3.5 rounded-xl font-medium text-red-300 transition-all hover:bg-red-900/20"
            style={{ border: "1px solid rgba(239,68,68,0.35)" }}
          >
            Yes, Return to Lobby
            <span className="block text-xs opacity-70 mt-0.5">Ya, Kembali ke Lobi</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 4: Stress Assessment Quiz ────────────────────────────────────────
const QUIZ_QUESTIONS = [
  {
    id: 1,
    ms: "Sejauh mana otot badan anda tegang atau nafas terasa sempit hari ini?",
    en: "How tense are your muscles or tight is your breathing today?",
    lowLabel: "Sangat Tenang",
    highLabel: "Sangat Tegang",
  },
  {
    id: 2,
    ms: "Adakah fikiran terasa laju dan sarat dengan pelbagai perkara?",
    en: "Does your mind feel rushed and overloaded with many things?",
    lowLabel: "Sangat Fokus",
    highLabel: "Sangat Berserabut",
  },
  {
    id: 3,
    ms: "Bagaimana tahap keletihan mental atau emosi anda ketika ini?",
    en: "How is your level of mental or emotional exhaustion right now?",
    lowLabel: "Sangat Segar",
    highLabel: "Sangat Lesu",
  },
];

const NODE_STATES = [
  { value: 1, emoji: "😌", label: "1" },
  { value: 2, emoji: "🙂", label: "2" },
  { value: 3, emoji: "😐", label: "3" },
  { value: 4, emoji: "😟", label: "4" },
  { value: 5, emoji: "😰", label: "5" },
];

function QuizScreen({ onComplete }: { onComplete: (scores: number[]) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([0, 0, 0]);
  const [animDir, setAnimDir] = useState<"in" | "out">("in");
  const [visible, setVisible] = useState(true);

  const q = QUIZ_QUESTIONS[step];
  const selected = answers[step];

  const navigate = (dir: "prev" | "next") => {
    setVisible(false);
    setAnimDir("out");
    setTimeout(() => {
      if (dir === "next") {
        if (step === QUIZ_QUESTIONS.length - 1) {
          onComplete(answers);
        } else {
          setStep((s) => s + 1);
        }
      } else {
        setStep((s) => Math.max(0, s - 1));
      }
      setAnimDir("in");
      setVisible(true);
    }, 220);
  };

  const setAnswer = (val: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = val;
      return next;
    });
  };

  const isLast = step === QUIZ_QUESTIONS.length - 1;
  const canProceed = selected > 0;

  return (
    <div className="relative min-h-screen star-bg flex items-center justify-center px-5 py-10 overflow-hidden">
      <StarField />

      {/* Ambient center bloom */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.06) 0%, transparent 55%)",
      }}/>

      <div className="relative z-10 w-full max-w-md">
        {/* Modal header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.25)",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M9 12l2 2 4-4M22 12A10 10 0 11 2 12a10 10 0 0120 0z"/>
            </svg>
            <span className="text-emerald-400 text-xs tracking-widest uppercase">Ujian Saringan Pantas</span>
          </div>
          <h1 className="font-display text-2xl text-white mb-1">Penilaian Ketenangan Diri</h1>
          <p className="text-slate-500 text-xs">Self-Tranquility Assessment</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-6 px-1">
          {QUIZ_QUESTIONS.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: i < step ? "100%" : i === step ? "50%" : "0%",
                  background: i < step
                    ? "linear-gradient(90deg,#059669,#10b981)"
                    : "linear-gradient(90deg,#10b981,#d4a843)",
                  boxShadow: i === step ? "0 0 8px rgba(16,185,129,0.6)" : "none",
                }}
              />
            </div>
          ))}
          <span className="text-slate-500 text-xs font-mono whitespace-nowrap ml-1">{step + 1} / {QUIZ_QUESTIONS.length}</span>
        </div>

        {/* Question card */}
        <div
          className="glass rounded-2xl p-7 mb-5"
          style={{
            border: "1px solid rgba(16,185,129,0.18)",
            boxShadow: "0 8px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(16,185,129,0.12)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : animDir === "out" ? "translateY(-12px)" : "translateY(12px)",
            transition: "opacity 0.22s ease, transform 0.22s ease",
          }}
        >
          {/* Q number badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-display"
              style={{ background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", boxShadow: "0 0 12px rgba(16,185,129,0.4)" }}>
              {q.id}
            </div>
            <div className="h-px flex-1" style={{ background: "rgba(16,185,129,0.2)" }}/>
          </div>

          {/* Question text */}
          <p className="text-white text-base font-medium leading-relaxed mb-1">{q.ms}</p>
          <p className="text-slate-500 text-xs leading-relaxed mb-7">{q.en}</p>

          {/* 5-point emoji scale */}
          <div className="relative">
            {/* Connecting track */}
            <div className="absolute top-6 left-[10%] right-[10%] h-0.5 rounded-full" style={{
              background: "rgba(255,255,255,0.08)",
            }}/>
            {/* Filled track up to selection */}
            {selected > 0 && (
              <div className="absolute top-6 left-[10%] h-0.5 rounded-full transition-all duration-400" style={{
                width: `${((selected - 1) / 4) * 80}%`,
                background: "linear-gradient(90deg,#10b981,#d4a843)",
                boxShadow: "0 0 6px rgba(16,185,129,0.5)",
              }}/>
            )}

            <div className="flex justify-between items-start relative">
              {NODE_STATES.map((node) => {
                const isSelected = selected === node.value;
                return (
                  <button
                    key={node.value}
                    onClick={() => setAnswer(node.value)}
                    className="flex flex-col items-center gap-2 group"
                    style={{ width: "18%" }}
                  >
                    {/* Node circle */}
                    <div className="relative flex items-center justify-center transition-all duration-300"
                      style={{
                        width: isSelected ? 52 : 44,
                        height: isSelected ? 52 : 44,
                        borderRadius: "50%",
                        background: isSelected
                          ? "linear-gradient(135deg,#059669,#10b981)"
                          : "rgba(255,255,255,0.06)",
                        border: isSelected
                          ? "2px solid rgba(16,185,129,0.8)"
                          : "1.5px solid rgba(255,255,255,0.12)",
                        boxShadow: isSelected
                          ? "0 0 20px rgba(16,185,129,0.6), 0 0 40px rgba(16,185,129,0.2)"
                          : "none",
                        transform: isSelected ? "translateY(-4px)" : "none",
                      }}>
                      <span style={{ fontSize: isSelected ? 22 : 18, lineHeight: 1, filter: isSelected ? "none" : "grayscale(40%) opacity(0.6)" }}>
                        {node.emoji}
                      </span>
                      {isSelected && (
                        <div className="absolute inset-0 rounded-full animate-breathe-ring" style={{
                          border: "1px solid rgba(16,185,129,0.4)",
                          borderRadius: "50%",
                        }}/>
                      )}
                    </div>
                    {/* Label */}
                    <span className="font-mono text-[11px] transition-colors duration-200" style={{
                      color: isSelected ? "#10b981" : "rgba(255,255,255,0.3)",
                      fontWeight: isSelected ? 600 : 400,
                    }}>
                      {node.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scale labels */}
          <div className="flex justify-between mt-3 px-1">
            <span className="text-[10px] text-slate-500">{q.lowLabel}</span>
            <span className="text-[10px] text-slate-500">{q.highLabel}</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("prev")}
            disabled={step === 0}
            className="flex-1 py-3.5 rounded-xl font-medium text-sm transition-all duration-200"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.13)",
              color: step === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
              cursor: step === 0 ? "not-allowed" : "pointer",
            }}
          >
            ← Sebelumnya
          </button>
          <button
            onClick={() => canProceed && navigate("next")}
            disabled={!canProceed}
            className="flex-[2] py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background: canProceed
                ? "linear-gradient(135deg,#059669,#10b981)"
                : "rgba(255,255,255,0.05)",
              color: canProceed ? "#fff" : "rgba(255,255,255,0.25)",
              boxShadow: canProceed ? "0 0 24px rgba(16,185,129,0.4)" : "none",
              cursor: canProceed ? "pointer" : "not-allowed",
              border: canProceed ? "none" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {isLast ? "✦ Lihat Cadangan" : "Seterusnya →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 5: Recommendation Transition ──────────────────────────────────────
const RECO_LOW = {
  label: "Kelesuan / Burnout",
  labelColor: "#d4a843",
  badgeBg: "rgba(212,168,67,0.15)",
  badgeBorder: "rgba(212,168,67,0.35)",
  title: "Terapi Horizon Terbuka",
  subtitle: "Pantai Redang & Sekinchan",
  desc: "Bunyi ombak, udara terbuka, dan cakrawala yang luas — persekitaran ideal untuk membebaskan beban mental secara perlahan.",
  descEn: "Open ocean horizons and rhythmic waves — ideal for gently releasing accumulated stress.",
  image: "https://images.unsplash.com/photo-1782358218179-bbde69745919?w=800&h=480&fit=crop&auto=format",
  alt: "Vibrant tropical sunset over ocean — Redang Beach therapy",
  glowColor: "rgba(212,168,67,0.25)",
  borderColor: "rgba(212,168,67,0.45)",
  scoreRange: "3 – 10",
};

const RECO_HIGH = {
  label: "Fikiran Berserabut / Gelisah",
  labelColor: "#60a5fa",
  badgeBg: "rgba(96,165,250,0.12)",
  badgeBorder: "rgba(96,165,250,0.35)",
  title: "Terapi Aliran Dinamik",
  subtitle: "Air Terjun Kanching, Rawang",
  desc: "Bunyi air yang mengalir deras, kehijauan hutan, dan suasana yang bertenaga — membantu melepaskan ketegangan fikiran yang terbeban.",
  descEn: "Cascading water and deep jungle immersion — designed to discharge overloaded mental tension.",
  image: "https://images.unsplash.com/photo-1659947760951-2b1c1129c319?w=800&h=480&fit=crop&auto=format",
  alt: "Lush tropical waterfall cascade — Kanching therapy",
  glowColor: "rgba(96,165,250,0.2)",
  borderColor: "rgba(96,165,250,0.4)",
  scoreRange: "11 – 15",
};

function RecommendationScreen({
  scores,
  onEnter,
  onManual,
}: {
  scores: number[];
  onEnter: () => void;
  onManual: () => void;
}) {
  const total = scores.reduce((s, v) => s + v, 0);
  const reco = total <= 10 ? RECO_LOW : RECO_HIGH;
  const [countdown, setCountdown] = useState(5);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (countdown === 0) { onEnter(); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onEnter]);

  const circumference = 2 * Math.PI * 20;
  const progress = ((5 - countdown) / 5) * circumference;

  return (
    <div className="relative min-h-screen star-bg flex items-center justify-center px-5 py-10 overflow-hidden">
      <StarField />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at 50% 45%, ${reco.glowColor} 0%, transparent 55%)`,
      }}/>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Score summary chip */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${reco.borderColor})` }}/>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{
            background: reco.badgeBg,
            border: `1px solid ${reco.badgeBorder}`,
          }}>
            <span className="text-xs font-semibold" style={{ color: reco.labelColor }}>{reco.label}</span>
            <span className="text-[10px] font-mono" style={{ color: reco.labelColor, opacity: 0.7 }}>Skor {total}/15</span>
          </div>
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${reco.borderColor}, transparent)` }}/>
        </div>

        {/* Result card */}
        <div className="rounded-2xl overflow-hidden mb-5" style={{
          border: `1.5px solid ${reco.borderColor}`,
          boxShadow: `0 0 40px ${reco.glowColor}, 0 12px 48px rgba(0,0,0,0.65)`,
        }}>
          {/* Thumbnail */}
          <div className="relative" style={{ height: 200, background: "#071525" }}>
            <img
              src={reco.image}
              alt={reco.alt}
              onLoad={() => setImageLoaded(true)}
              className="w-full h-full object-cover transition-opacity duration-700"
              style={{ opacity: imageLoaded ? 1 : 0 }}
            />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(to bottom, rgba(5,13,26,0.1) 0%, rgba(5,13,26,0.85) 100%)",
            }}/>
            {/* Floating therapy badge */}
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full" style={{
              background: reco.badgeBg,
              border: `1px solid ${reco.badgeBorder}`,
              backdropFilter: "blur(8px)",
            }}>
              <span className="text-xs font-semibold" style={{ color: reco.labelColor }}>
                {reco.label}
              </span>
            </div>
            {/* Score ring — top right */}
            <div className="absolute top-3 right-3 flex items-center justify-center">
              <svg width={52} height={52} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={26} cy={26} r={20} fill="rgba(5,13,26,0.7)" stroke="rgba(255,255,255,0.08)" strokeWidth={3}/>
                <circle cx={26} cy={26} r={20} fill="none" stroke={reco.labelColor}
                  strokeWidth={3} strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 4px ${reco.labelColor})` }}
                />
              </svg>
              <span className="absolute font-mono text-sm font-bold" style={{ color: reco.labelColor }}>{countdown}</span>
            </div>
            {/* Location name overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-0.5">Cadangan</p>
              <p className="text-white font-display text-lg leading-tight">{reco.title}</p>
              <p className="text-slate-300 text-sm">{reco.subtitle}</p>
            </div>
          </div>

          {/* Card body */}
          <div className="p-5" style={{ background: "rgba(8,18,35,0.92)" }}>
            <p className="text-slate-300 text-sm leading-relaxed mb-1">{reco.desc}</p>
            <p className="text-slate-500 text-xs leading-relaxed">{reco.descEn}</p>

            {/* Score breakdown pills */}
            <div className="flex gap-2 mt-4">
              {scores.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl" style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">S{i + 1}</span>
                  <span className="font-mono text-sm font-bold" style={{ color: reco.labelColor }}>{s}</span>
                  <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${(s / 5) * 100}%`,
                      background: reco.labelColor,
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onEnter}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base mb-3 relative overflow-hidden transition-all hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg,#059669,#10b981)",
            boxShadow: "0 0 32px rgba(16,185,129,0.5)",
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            <span>Masuk ke Ruang Tadabbur</span>
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              {countdown}
            </span>
          </span>
          <span className="relative z-10 block text-xs opacity-70 mt-0.5 font-normal">
            Enter the Tadabbur Space
          </span>
          {/* Shimmer sweep */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.08) 50%, transparent 65%)",
            animation: "shimmer 2.5s linear infinite",
          }}/>
        </button>

        <button
          onClick={onManual}
          className="w-full text-center text-sm transition-colors hover:text-emerald-300"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          Pilih lokasi lain secara manual ↗
        </button>
      </div>
    </div>
  );
}

// ─── Main Lobby ────────────────────────────────────────────────────────────────
function LobbyScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="relative min-h-screen star-bg flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <StarField />
      <div className="relative z-10 animate-fade-in">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-glow"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.2), rgba(16,185,129,0.05))", border: "2px solid rgba(16,185,129,0.5)" }}>
          <span className="text-4xl">🕌</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-white mb-2">TadabburVerse</h1>
        <p className="gold-text font-display text-lg mb-2">Main Lobby</p>
        <p className="text-slate-400 text-sm mb-2">Menu Utama</p>
        <p className="text-slate-500 text-sm max-w-xs mx-auto mb-10 leading-relaxed">
          Your session has ended. May your heart find stillness in remembrance.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
          <button
            onClick={onRestart}
            className="py-4 rounded-2xl font-semibold text-white text-base transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 0 30px rgba(16,185,129,0.4)" }}
          >
            Begin New Session
            <span className="block text-xs opacity-70 mt-0.5 font-normal">Mulai Sesi Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VR World Configs ─────────────────────────────────────────────────────────
const VR_WORLDS = {
  pantai: {
    name: "Pantai Redang & Sekinchan",
    therapy: "Terapi Horizon Terbuka",
    tagline: "Biarkan ombak membasuh kerisauan anda",
    taglineEn: "Let the waves wash your worries away",
    image: "https://images.unsplash.com/photo-1679996592747-a11a885b3ecd?w=1600&h=900&fit=crop&auto=format",
    panoramaUrl: "https://images.unsplash.com/photo-1597868438162-3a95279928a3?w=4096&h=2048&fit=crop&auto=format",
    videoUrl: "https://stream.mux.com/3KfZfDL9KpVf01X00iCVd7Han6Et8zvvCmNxU02pJIudw8.m3u8",
    imageAlt: "Wide golden ocean sunset over calm tropical waters",
    accentColor: "#d4a843",
    accentGlow: "rgba(212,168,67,0.35)",
    accentGlowSoft: "rgba(212,168,67,0.12)",
    gradient: "linear-gradient(135deg,#92521a,#d4a843,#f0c866)",
    bgGradient: "radial-gradient(ellipse at 50% 60%, rgba(180,100,20,0.18) 0%, rgba(5,13,26,0.0) 60%)",
    particleColor: "rgba(240,200,102,",
    soundHint: "Ombak & Angin Laut",
    soundHintEn: "Ocean Waves & Sea Breeze",
    ambientCues: [
      { icon: "🌊", text: "Dengar bunyi ombak memukul pantai", en: "Listen to waves meeting the shore" },
      { icon: "🌅", text: "Pandang ke ufuk yang terbuka luas", en: "Gaze toward the open horizon" },
      { icon: "🌬️", text: "Rasai angin laut menyentuh wajah", en: "Feel the ocean breeze on your face" },
    ],
    defaultTrack: QURAN_TRACKS[0],
    natureSrc: "https://stream.mux.com/XcTtbb02JqwftDxNDzqNwgsdNrVhHiu3o68h02ytF3kic.m3u8",
    overlayFrom: "rgba(180,90,10,0.55)",
    overlayTo: "rgba(5,13,26,0.75)",
  },
  airterjun: {
    name: "Air Terjun Kanching, Rawang",
    therapy: "Terapi Aliran Dinamik",
    tagline: "Biarkan aliran air membersihkan fikiran",
    taglineEn: "Let flowing water cleanse the mind",
    image: "https://images.unsplash.com/photo-1544177817-454e1238e05f?w=1600&h=900&fit=crop&auto=format",
    panoramaUrl: "https://images.unsplash.com/photo-1544177817-454e1238e05f?w=4096&h=2048&fit=crop&auto=format",
    videoUrl: "https://stream.mux.com/BlaGFyZdQwwQSrf022tUREyWoXXsZdryfWKEWBSD71b4.m3u8",
    imageAlt: "Cascading waterfalls in lush green tropical ravine",
    accentColor: "#60a5fa",
    accentGlow: "rgba(96,165,250,0.35)",
    accentGlowSoft: "rgba(96,165,250,0.12)",
    gradient: "linear-gradient(135deg,#1d4ed8,#60a5fa,#bae6fd)",
    bgGradient: "radial-gradient(ellipse at 50% 40%, rgba(30,80,200,0.18) 0%, rgba(5,13,26,0.0) 60%)",
    particleColor: "rgba(96,165,250,",
    soundHint: "Air Terjun & Bunyi Hutan",
    soundHintEn: "Waterfall Cascade & Forest Sounds",
    ambientCues: [
      { icon: "💧", text: "Dengar bunyi air terjun yang tenang", en: "Listen to the soothing cascade" },
      { icon: "🌿", text: "Perhatikan kehijauan hutan sekitar", en: "Notice the lush greenery around you" },
      { icon: "🌫️", text: "Rasai percikan kabus air yang segar", en: "Feel the cool mist on your skin" },
    ],
    defaultTrack: DHIKR_TRACKS[2],
    natureSrc: "https://stream.mux.com/G01mfPGwoBhfNaR5Kaa98Ri01ZB2Qwh01202wrZX1QWiSkI.m3u8",
    overlayFrom: "rgba(10,40,100,0.5)",
    overlayTo: "rgba(5,13,26,0.78)",
  },
} as const;

type WorldKey = keyof typeof VR_WORLDS;

// ─── VR World Screen ──────────────────────────────────────────────────────────
function VRWorldScreen({
  worldKey,
  onBeginTadabbur,
  onBack,
}: {
  worldKey: WorldKey;
  onBeginTadabbur: () => void;
  onBack: () => void;
}) {
  const world = VR_WORLDS[worldKey];
  const [phase, setPhase] = useState<"loading" | "entered" | "hub">("loading");
  const [imageReady, setImageReady] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"in" | "hold" | "out">("in");
  const [breathStep, setBreathStep] = useState(0);
  const [particles] = useState(() =>
    Array.from({ length: worldKey === "airterjun" ? 28 : 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 8 + 4,
      delay: Math.random() * 5,
      drift: (Math.random() - 0.5) * 30,
    }))
  );

  // Breath cycle: in 4s → hold 1s → out 4s → hold 1s → repeat
  const BREATH_SEQUENCE: { phase: "in" | "hold" | "out"; dur: number }[] = [
    { phase: "in",   dur: 4000 },
    { phase: "hold", dur: 1000 },
    { phase: "out",  dur: 4000 },
    { phase: "hold", dur: 1000 },
  ];

  useEffect(() => {
    if (phase === "loading") return;
    const step = breathStep % BREATH_SEQUENCE.length;
    setBreathPhase(BREATH_SEQUENCE[step].phase);
    const t = setTimeout(() => setBreathStep((s) => s + 1), BREATH_SEQUENCE[step].dur);
    return () => clearTimeout(t);
  }, [breathStep, phase]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageReady(true);
      const t = setTimeout(() => setPhase("entered"), 600);
      return () => clearTimeout(t);
    };
    img.src = world.image;
  }, [world.image]);

  return (
    <div className="relative w-full min-h-screen overflow-hidden" style={{ background: "#050d1a" }}>

      {/* ── Static background image ── */}
      <div className="absolute inset-0" style={{ opacity: imageReady ? 1 : 0, transition: "opacity 1.5s ease" }}>
        <img
          src={world.image}
          alt={world.name}
          className="w-full h-full object-cover"
          style={{
            transform: phase === "loading" ? "scale(1.08)" : "scale(1.0)",
            transition: "transform 3s cubic-bezier(0.25,0.46,0.45,0.94)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `linear-gradient(to bottom, ${world.overlayFrom} 0%, transparent 35%, transparent 55%, ${world.overlayTo} 100%)`,
        }}/>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(5,13,26,0.55) 100%)",
        }}/>
      </div>

      {/* ── Ambient particles ── */}
      {phase !== "loading" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                background: `${world.particleColor}0.7)`,
                boxShadow: `0 0 ${p.size * 3}px ${world.particleColor}0.5)`,
                animation: worldKey === "airterjun"
                  ? `float-particle-rain ${p.speed}s linear ${p.delay}s infinite`
                  : `float-particle-drift ${p.speed}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Loading shimmer ── */}
      {!imageReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <StarField />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse-glow" style={{
              border: `2px solid ${world.accentColor}`,
              background: world.accentGlowSoft,
            }}>
              <span className="text-3xl">{worldKey === "pantai" ? "🌊" : "💧"}</span>
            </div>
            <p className="font-display text-sm tracking-widest uppercase" style={{ color: world.accentColor }}>
              Memasuki dunia VR...
            </p>
            <div className="flex gap-1.5">
              {[0,1,2,3].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{ background: world.accentColor, animation: `pulse-glow 1s ${i*0.2}s infinite` }}/>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── World entry HUD — shown after image loads ── */}
      {phase !== "loading" && (
        <>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 pt-8 pb-4 animate-fade-in">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:scale-105"
              style={{ background: "rgba(5,13,26,0.6)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              <span className="text-slate-300 text-xs">Kembali</span>
            </button>

            {/* World badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "rgba(5,13,26,0.65)", border: `1px solid ${world.accentGlow}`, backdropFilter: "blur(12px)" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: world.accentColor, boxShadow: `0 0 8px ${world.accentColor}` }}/>
              <span className="text-xs font-medium" style={{ color: world.accentColor }}>{world.therapy}</span>
            </div>
          </div>

          {/* ── Compact breathing strip — top of screen, below top bar ── */}
          <div className="absolute left-0 right-0 z-20 flex flex-col items-center animate-fade-in pointer-events-none"
            style={{ top: 88 }}>

            {/* Pill container */}
            <div className="flex items-center gap-4 px-5 py-3 rounded-2xl"
              style={{
                background: "rgba(5,13,26,0.55)",
                border: `1px solid ${world.accentGlow}`,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}>

              {/* Breathing ring + orb */}
              <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44 }}>
                {/* Outer ripple */}
                <div className="absolute rounded-full" style={{
                  width: 44, height: 44,
                  border: `1.5px solid ${world.accentColor}`,
                  opacity: breathPhase === "in" ? 0 : 0.35,
                  transform: breathPhase === "in" ? "scale(1.5)" : "scale(1)",
                  transition: breathPhase === "in"
                    ? "transform 4s ease-in-out, opacity 4s ease-in-out"
                    : "transform 0.3s ease, opacity 0.3s ease",
                }}/>
                {/* Middle ring */}
                <div className="absolute rounded-full" style={{
                  width: 34, height: 34,
                  border: `1px solid ${world.accentColor}`,
                  opacity: 0.25,
                  transform: breathPhase === "in" ? "scale(1.3)" : "scale(1)",
                  transition: "transform 4s ease-in-out, opacity 4s ease-in-out",
                }}/>
                {/* Core orb */}
                <div className="rounded-full flex items-center justify-center transition-all duration-[4000ms] ease-in-out" style={{
                  width: breathPhase === "in" ? 30 : breathPhase === "out" ? 18 : breathPhase === "hold" && breathStep % 4 === 1 ? 30 : 18,
                  height: breathPhase === "in" ? 30 : breathPhase === "out" ? 18 : breathPhase === "hold" && breathStep % 4 === 1 ? 30 : 18,
                  background: `radial-gradient(circle, ${world.accentColor} 0%, ${world.accentGlow} 100%)`,
                  boxShadow: `0 0 ${breathPhase === "in" ? 20 : 8}px ${world.accentColor}, 0 0 ${breathPhase === "in" ? 40 : 14}px ${world.accentGlow}`,
                }}/>
              </div>

              {/* Divider */}
              <div className="w-px h-8 flex-shrink-0" style={{ background: `${world.accentColor}30` }}/>

              {/* Text cue */}
              <div className="flex flex-col min-w-[130px]">
                <span className="font-display text-sm font-semibold tracking-wide transition-all duration-500" style={{ color: world.accentColor }}>
                  {breathPhase === "in"   && "Tarik Nafas..."}
                  {breathPhase === "out"  && "Hembus Nafas..."}
                  {breathPhase === "hold" && "Tahan Sebentar..."}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 tracking-wide">
                  {breathPhase === "in"   && "Breathe In"}
                  {breathPhase === "out"  && "Breathe Out"}
                  {breathPhase === "hold" && "Hold"}
                </span>
              </div>

              {/* Divider */}
              <div className="w-px h-8 flex-shrink-0" style={{ background: `${world.accentColor}30` }}/>

              {/* Waveform ambient indicator */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <WaveformIcon bars={7} color={world.accentColor} playing={breathPhase !== "hold"}/>
                <span className="text-[9px] text-slate-500 tracking-wider">{world.soundHint}</span>
              </div>
            </div>

            {/* World name subtitle — slim line just below pill */}
            <div className="flex items-center gap-2 mt-2.5">
              <div className="h-px w-12" style={{ background: `linear-gradient(90deg, transparent, ${world.accentColor}60)` }}/>
              <span className="text-[10px] tracking-[0.25em] uppercase font-mono" style={{ color: world.accentColor, opacity: 0.7 }}>
                {world.name}
              </span>
              <div className="h-px w-12" style={{ background: `linear-gradient(90deg, ${world.accentColor}60, transparent)` }}/>
            </div>
          </div>

          {/* ── Ambient cues strip — only before hub opens ── */}
          {phase === "entered" && (
            <div className="absolute bottom-52 left-0 right-0 z-20 flex justify-center gap-3 px-6 animate-slide-up">
              {world.ambientCues.map((cue, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl flex-1 max-w-[110px]"
                  style={{
                    background: "rgba(5,13,26,0.6)",
                    border: `1px solid ${world.accentGlowSoft.replace("0.12","0.25")}`,
                    backdropFilter: "blur(12px)",
                    animationDelay: `${i * 0.12}s`,
                  }}
                >
                  <span className="text-xl">{cue.icon}</span>
                  <p className="text-slate-300 text-[10px] text-center leading-snug">{cue.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Enter button ── */}
          {phase === "entered" && (
            <div className="absolute bottom-10 left-0 right-0 z-30 flex flex-col items-center gap-3 px-6 animate-slide-up">
              <button
                onClick={onBeginTadabbur}
                className="w-full max-w-xs py-4 rounded-2xl font-semibold text-white text-base relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: world.gradient,
                  boxShadow: `0 0 40px ${world.accentGlow}, 0 4px 24px rgba(0,0,0,0.5)`,
                }}
              >
                <span className="relative z-10">Mula Sesi Tadabbur ✦</span>
                <span className="relative z-10 block text-xs opacity-75 mt-0.5 font-normal">Begin Tadabbur Session</span>
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.12) 50%,transparent 65%)",
                  animation: "shimmer 2.5s linear infinite",
                }}/>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Location Picker Screen ───────────────────────────────────────────────────
function LocationPickerScreen({
  recommendedKey,
  onSelect,
  onBack,
}: {
  recommendedKey: WorldKey;
  onSelect: (key: WorldKey) => void;
  onBack: () => void;
}) {
  const [hovered, setHovered] = useState<WorldKey | null>(null);
  const [imageReady, setImageReady] = useState<Record<WorldKey, boolean>>({ pantai: false, airterjun: false });

  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const hoverHlsRef   = useRef<Hls | null>(null);

  const playHoverSound = (key: WorldKey) => {
    // Destroy previous hover audio
    destroyAudio(hoverAudioRef.current, hoverHlsRef.current);
    hoverAudioRef.current = null;
    hoverHlsRef.current = null;

    const src = key === "pantai"
      ? "https://stream.mux.com/XcTtbb02JqwftDxNDzqNwgsdNrVhHiu3o68h02ytF3kic.m3u8"
      : "https://stream.mux.com/G01mfPGwoBhfNaR5Kaa98Ri01ZB2Qwh01202wrZX1QWiSkI.m3u8";

    const { audio, hls } = createAudio(src, 0);
    hoverAudioRef.current = audio;
    hoverHlsRef.current = hls;

    // Wait for HLS to attach before playing, then fade in
    const startPlay = () => {
      audio.play().catch(() => {});
      let vol = 0;
      const fadeIn = setInterval(() => {
        vol = Math.min(vol + 0.05, 0.5);
        if (hoverAudioRef.current === audio) audio.volume = vol;
        if (vol >= 0.5) clearInterval(fadeIn);
      }, 60);
    };

    if (hls) {
      hls.on(Hls.Events.MANIFEST_PARSED, startPlay);
    } else {
      startPlay();
    }
  };

  const stopHoverSound = () => {
    const audio = hoverAudioRef.current;
    const hls   = hoverHlsRef.current;
    if (!audio) return;
    // Fade out then destroy
    const fadeOut = setInterval(() => {
      audio.volume = Math.max(audio.volume - 0.06, 0);
      if (audio.volume <= 0) {
        clearInterval(fadeOut);
        destroyAudio(audio, hls);
        if (hoverAudioRef.current === audio) { hoverAudioRef.current = null; hoverHlsRef.current = null; }
      }
    }, 50);
  };

  const stopHoverImmediate = () => {
    destroyAudio(hoverAudioRef.current, hoverHlsRef.current);
    hoverAudioRef.current = null;
    hoverHlsRef.current = null;
  };

  useEffect(() => {
    return () => stopHoverImmediate();
  }, []);

  const worlds: { key: WorldKey; emoji: string; score: string }[] = [
    { key: "pantai",    emoji: "🌊", score: "Skor 3–10"  },
    { key: "airterjun", emoji: "💧", score: "Skor 11–15" },
  ];

  return (
    <div className="relative min-h-screen star-bg flex flex-col items-center justify-center px-5 py-10 overflow-hidden">
      <StarField />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 40%, rgba(16,185,129,0.07) 0%, transparent 55%)",
      }}/>

      <div className="relative z-10 w-full max-w-2xl animate-fade-in px-2">

        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-7 text-slate-400 hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          <span className="text-sm">Kembali ke Cadangan</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.25)",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            <span className="text-emerald-400 text-xs tracking-widest uppercase">Pilih Lokasi Manual</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl text-white mb-2">
            Pilih Dunia VR Anda
          </h1>
          <p className="text-slate-400 text-sm">Choose Your VR World</p>
          <p className="text-slate-500 text-xs mt-1">2 persekitaran tersedia untuk sesi tadabbur anda</p>
        </div>

        {/* World cards — side by side */}
        <div className="grid grid-cols-2 gap-4">
          {worlds.map(({ key, emoji, score }) => {
            const w = VR_WORLDS[key];
            const isRecommended = key === recommendedKey;
            const isHov = hovered === key;

            return (
              <button
                key={key}
                onClick={() => { stopHoverImmediate(); onSelect(key); }}
                onMouseEnter={() => { setHovered(key); playHoverSound(key); }}
                onMouseLeave={() => { setHovered(null); stopHoverSound(); }}
                className="relative rounded-2xl overflow-hidden text-left flex flex-col transition-all duration-300"
                style={{
                  border: isHov
                    ? `2px solid ${w.accentColor}`
                    : isRecommended
                    ? `1.5px solid ${w.accentColor}80`
                    : "1.5px solid rgba(255,255,255,0.1)",
                  boxShadow: isHov
                    ? `0 0 40px ${w.accentGlow}, 0 8px 32px rgba(0,0,0,0.6)`
                    : isRecommended
                    ? `0 0 20px ${w.accentGlowSoft}, 0 4px 20px rgba(0,0,0,0.4)`
                    : "0 4px 20px rgba(0,0,0,0.4)",
                  transform: isHov ? "translateY(-4px) scale(1.02)" : "none",
                }}
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0" style={{ height: 200, background: "#071525" }}>
                  <img
                    src={`${w.image.split('?')[0]}?w=600&h=400&fit=crop&auto=format`}
                    alt={w.imageAlt}
                    onLoad={() => setImageReady((prev) => ({ ...prev, [key]: true }))}
                    className="w-full h-full object-cover"
                    style={{
                      opacity: imageReady[key] ? 1 : 0,
                      transform: isHov ? "scale(1.06)" : "scale(1)",
                      transition: "opacity 0.7s ease, transform 0.5s ease",
                    }}
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0" style={{
                    background: isHov
                      ? `linear-gradient(to bottom, ${w.overlayFrom.replace("0.5","0.2")} 0%, ${w.overlayTo.replace("0.75","0.45")} 100%)`
                      : `linear-gradient(to bottom, ${w.overlayFrom} 0%, ${w.overlayTo} 100%)`,
                    transition: "background 0.4s ease",
                  }}/>

                  {/* Recommended badge — top left */}
                  {isRecommended && (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full" style={{
                      background: w.accentGlowSoft,
                      border: `1px solid ${w.accentColor}60`,
                      backdropFilter: "blur(8px)",
                    }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill={w.accentColor}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span className="text-[9px] font-semibold leading-none" style={{ color: w.accentColor }}>
                        Disyorkan
                      </span>
                    </div>
                  )}

                  {/* Emoji pill — top right */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-full" style={{
                    background: "rgba(5,13,26,0.72)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(8px)",
                  }}>
                    <span style={{ fontSize: 13 }}>{emoji}</span>
                    <span className="text-slate-400 text-[9px] font-mono">{score}</span>
                  </div>

                  {/* Bottom gradient name strip */}
                  <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6" style={{
                    background: "linear-gradient(to top, rgba(8,18,35,1) 0%, transparent 100%)",
                  }}>
                    <p className="text-[9px] uppercase tracking-[0.2em] mb-0.5" style={{ color: w.accentColor, opacity: 0.85 }}>
                      {w.therapy}
                    </p>
                    <p className="text-white font-display text-sm leading-snug">{w.name}</p>
                  </div>
                </div>

                {/* Card body */}
                <div className="flex-1 flex flex-col p-4" style={{
                  background: isHov ? "rgba(8,18,35,0.98)" : "rgba(8,18,35,0.92)",
                  transition: "background 0.3s ease",
                }}>
                  <p className="text-slate-400 text-xs leading-relaxed mb-3 flex-1">{w.tagline}</p>

                  {/* Waveform sound row */}
                  <div className="flex items-center gap-1.5 mb-4 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <WaveformIcon bars={5} color={w.accentColor} playing={isHov}/>
                    <span className="text-[10px] truncate" style={{ color: w.accentColor, opacity: 0.7 }}>{w.soundHint}</span>
                  </div>

                  {/* Enter CTA */}
                  <div
                    className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-300"
                    style={{
                      background: isHov ? w.gradient : "rgba(255,255,255,0.06)",
                      color: isHov ? "#fff" : "rgba(255,255,255,0.45)",
                      boxShadow: isHov ? `0 0 20px ${w.accentGlow}` : "none",
                      border: isHov ? "none" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <span>Pilih Dunia Ini</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-slate-600 text-xs mt-5">
          Pilih mana-mana persekitaran untuk memulakan sesi tadabbur anda
        </p>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("splash-uis");
  const [showExitModal, setShowExitModal] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>(QURAN_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [natureVol, setNatureVol] = useState(65);
  const [zikrVol, setZikrVol] = useState(80);
  const [quizScores, setQuizScores] = useState<number[]>([3, 4, 3]);
  const [manualWorldKey, setManualWorldKey] = useState<WorldKey | null>(null);

  // Real audio element for session track playback
  const sessionAudioRef = useRef<HTMLAudioElement | null>(null);
  const sessionHlsRef   = useRef<Hls | null>(null);

  // When track changes: stop previous, create new (with HLS support)
  useEffect(() => {
    destroyAudio(sessionAudioRef.current, sessionHlsRef.current);
    sessionAudioRef.current = null;
    sessionHlsRef.current = null;

    const { audio, hls } = createAudio(currentTrack.src, zikrVol / 100);
    sessionAudioRef.current = audio;
    sessionHlsRef.current = hls;
    if (isPlaying && screen === "session") audio.play().catch(() => {});
    return () => { destroyAudio(audio, hls); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack.src]);

  // Handle play/pause and screen transitions
  useEffect(() => {
    const audio = sessionAudioRef.current;
    if (!audio) return;
    if (isPlaying && screen === "session") audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying, screen]);

  // Zikr/Quran volume control
  useEffect(() => {
    if (sessionAudioRef.current) sessionAudioRef.current.volume = zikrVol / 100;
  }, [zikrVol]);

  // ── Nature ambient audio ────────────────────────────────────────────────────
  const natureAudioRef = useRef<HTMLAudioElement | null>(null);
  const natureHlsRef   = useRef<Hls | null>(null);
  const totalScore = quizScores.reduce((s, v) => s + v, 0);
  const recommendedKey: WorldKey = totalScore <= 10 ? "pantai" : "airterjun";
  const activeWorldKey: WorldKey = manualWorldKey ?? recommendedKey;

  // Swap nature sound when world changes — HLS worlds use video audio via VRVideoPlayer
  useEffect(() => {
    destroyAudio(natureAudioRef.current, natureHlsRef.current);
    natureAudioRef.current = null;
    natureHlsRef.current = null;

    const world = VR_WORLDS[activeWorldKey];
    if (world.videoUrl.includes(".m3u8")) return;
    const { audio, hls } = createAudio(world.natureSrc, natureVol / 100);
    natureAudioRef.current = audio;
    natureHlsRef.current = hls;
    if (screen === "session") audio.play().catch(() => {});
    return () => { destroyAudio(audio, hls); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorldKey]);

  // Play/pause nature audio with screen transitions
  useEffect(() => {
    const audio = natureAudioRef.current;
    if (!audio) return;
    if (screen === "session") audio.play().catch(() => {});
    else audio.pause();
  }, [screen]);

  // Nature volume
  useEffect(() => {
    if (natureAudioRef.current) natureAudioRef.current.volume = natureVol / 100;
  }, [natureVol]);

  // Mute all background audio on guided-intro — only guided-intro audio should play
  useEffect(() => {
    if (screen === "guided-intro") {
      sessionAudioRef.current?.pause();
      natureAudioRef.current?.pause();
    }
  }, [screen]);

  const goToMenu = () => { setScreen("main-menu"); setShowExitModal(false); setShowLibrary(false); };

  // ── Global WebXR state ────────────────────────────────────────────────────
  const [xrAvailable, setXrAvailable] = useState(false);
  const [autoEnterXR, setAutoEnterXR] = useState(false);

  useEffect(() => {
    if (!navigator.xr) return;
    navigator.xr.isSessionSupported("immersive-vr")
      .then((ok) => { if (ok) setXrAvailable(true); })
      .catch(() => {});
  }, []);

  // When user requests VR from a non-session screen, navigate to session first
  const handleGlobalVR = () => {
    if (screen === "session") {
      // VRVideoPlayer handles its own enter-VR button; scroll-click it
      const btn = document.querySelector("[data-vr-btn]") as HTMLButtonElement | null;
      btn?.click();
      return;
    }
    setAutoEnterXR(true);
    setIsPlaying(true);
    setScreen("session");
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {screen === "splash-uis" && (
        <SplashUIS onNext={() => setScreen("splash-app")} />
      )}

      {screen === "splash-app" && (
        <SplashApp onNext={() => setScreen("main-menu")} />
      )}

      {screen === "main-menu" && (
        <MainMenuScreen
          onMula={() => setScreen("quiz")}
          onBantuan={() => setScreen("bantuan")}
          onTentang={() => setScreen("tentang-kami")}
          onKeluar={() => setScreen("splash-uis")}
        />
      )}

      {screen === "bantuan" && (
        <BantuanScreen onClose={() => setScreen("main-menu")} />
      )}

      {screen === "tentang-kami" && (
        <TentangKamiScreen onClose={() => setScreen("main-menu")} />
      )}

      {screen === "quiz" && (
        <QuizScreen
          onComplete={(scores) => {
            setQuizScores(scores);
            setScreen("recommendation");
          }}
        />
      )}

      {screen === "recommendation" && (
        <RecommendationScreen
          scores={quizScores}
          onEnter={() => { setManualWorldKey(null); setScreen("vr-world"); }}
          onManual={() => setScreen("location-picker")}
        />
      )}

      {screen === "location-picker" && (
        <LocationPickerScreen
          recommendedKey={recommendedKey}
          onSelect={(key) => { setManualWorldKey(key); setScreen("vr-world"); }}
          onBack={() => setScreen("recommendation")}
        />
      )}

      {screen === "vr-world" && (
        <VRWorldScreen
          worldKey={activeWorldKey}
          onBeginTadabbur={() => setScreen("guided-intro")}
          onBack={() => setScreen(manualWorldKey ? "location-picker" : "recommendation")}
        />
      )}

      {screen === "assessment" && (
        <AssessmentScreen
          onContinue={() => setScreen("guided-intro")}
          onChooseManual={() => setScreen("guided-intro")}
        />
      )}

      {screen === "guided-intro" && (
        <GuidedIntroScreen onStart={() => { setIsPlaying(true); setScreen("session"); }} />
      )}

      {screen === "session" && (
        <div className="relative w-full min-h-screen">
          <SessionScreen
            onExit={() => setShowExitModal(true)}
            onOpenLibrary={() => setShowLibrary(true)}
            onBackToMenu={() => setShowExitModal(true)}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            natureVol={natureVol}
            setNatureVol={setNatureVol}
            zikrVol={zikrVol}
            setZikrVol={setZikrVol}
            worldKey={activeWorldKey}
            autoEnterXR={autoEnterXR}
            onXREntered={() => setAutoEnterXR(false)}
          />
          {showLibrary && (
            <AudioLibraryPanel
              selectedId={currentTrack.id}
              onClose={() => setShowLibrary(false)}
              onSave={(t) => {
                destroyAudio(sessionAudioRef.current, sessionHlsRef.current);
                sessionAudioRef.current = null;
                sessionHlsRef.current = null;
                setCurrentTrack(t);
                setIsPlaying(true);
                setShowLibrary(false);
              }}
            />
          )}
          {showExitModal && !showLibrary && (
            <ExitModal
              onCancel={() => setShowExitModal(false)}
              onConfirm={() => { setShowExitModal(false); setScreen("lobby"); }}
            />
          )}
        </div>
      )}

      {screen === "lobby" && (
        <LobbyScreen onRestart={goToMenu} />
      )}

      {/* ── Global floating VR button — visible on all screens when WebXR available ── */}
      {xrAvailable && screen !== "session" && (
        <button
          onClick={handleGlobalVR}
          title="Masuk VR Mode"
          className="fixed z-[999] flex items-center gap-2 px-4 py-2.5 rounded-full transition-all hover:scale-105 active:scale-95"
          style={{
            bottom: 24,
            right: 24,
            background: "rgba(5,13,26,0.85)",
            border: "1.5px solid rgba(16,185,129,0.5)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 0 24px rgba(16,185,129,0.25), 0 4px 16px rgba(0,0,0,0.5)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 8h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z"/>
            <circle cx="8.5" cy="13" r="2"/>
            <circle cx="15.5" cy="13" r="2"/>
            <path d="M10.5 13h3"/>
            <path d="M7 8V6a5 5 0 0 1 10 0v2"/>
          </svg>
          <span className="text-xs font-semibold text-emerald-400">Masuk VR</span>
        </button>
      )}
    </div>
  );
}
