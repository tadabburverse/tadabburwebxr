import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Hls from "hls.js";

interface Props {
  videoSrc: string;
  accentColor?: string;
  autoRotateSpeed?: number;
  fov?: number;
  volume?: number; // 0–1, controls video audio (0 = muted)
}

export default function VRVideoPlayer({
  videoSrc,
  accentColor = "#10b981",
  autoRotateSpeed = 0,
  fov = 80,
  volume = 0,
}: Props) {
  const mountRef  = useRef<HTMLDivElement>(null);
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus]   = useState<"loading" | "ready" | "playing" | "error">("loading");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Video element ────────────────────────────────────────────────────────
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = volume <= 0;
    video.volume = Math.max(0, Math.min(1, volume));
    video.playsInline = true;
    video.preload = "auto";
    videoRef.current = video;

    video.addEventListener("canplay", () => setStatus("ready"));

    // ── HLS or direct src ────────────────────────────────────────────────────
    let hls: Hls | null = null;
    const isHLS = videoSrc.includes(".m3u8");
    if (isHLS && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      // Only HLS errors count for HLS streams — ignore native video error event
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) { setMissing(true); setStatus("error"); }
      });
    } else {
      // Native HLS (Safari) or regular MP4 — use native error event
      video.src = videoSrc;
      video.addEventListener("error", () => { setMissing(true); setStatus("error"); });
    }

    // ── Three.js setup ───────────────────────────────────────────────────────
    const W = mount.clientWidth  || window.innerWidth;
    const H = mount.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 2000);

    // Sphere — inside-out so texture is viewed from within
    const geo = new THREE.SphereGeometry(500, 72, 40);
    geo.scale(-1, 1, 1);

    const texture  = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh     = new THREE.Mesh(geo, material);
    scene.add(mesh);

    // ── Look state ───────────────────────────────────────────────────────────
    let lon = 180, lat = -5;
    let autoRotate = autoRotateSpeed > 0;
    let pointerDown = false;
    let startX = 0, startY = 0, startLon = 0, startLat = 0;
    let resumeTimer: ReturnType<typeof setTimeout>;

    const scheduleResume = () => {
      if (autoRotateSpeed <= 0) return;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { autoRotate = true; }, 6000);
    };

    const applyLook = () => {
      lat = Math.max(-75, Math.min(75, lat));
      const phi   = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      camera.lookAt(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );
    };

    // ── Pointer events ───────────────────────────────────────────────────────
    const onPointerDown = (e: PointerEvent) => {
      pointerDown = true;
      autoRotate  = false;
      startX = e.clientX; startY = e.clientY;
      startLon = lon;     startLat = lat;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDown) return;
      lon = startLon - (e.clientX - startX) * 0.25;
      lat = startLat + (e.clientY - startY) * 0.25;
    };
    const onPointerUp = () => { pointerDown = false; scheduleResume(); };

    // ── Touch events ─────────────────────────────────────────────────────────
    let tX = 0, tY = 0, tLon = 0, tLat = 0;
    const onTouchStart = (e: TouchEvent) => {
      autoRotate = false;
      tX = e.touches[0].clientX; tY = e.touches[0].clientY;
      tLon = lon; tLat = lat;
    };
    const onTouchMove = (e: TouchEvent) => {
      lon = tLon - (e.touches[0].clientX - tX) * 0.28;
      lat = tLat + (e.touches[0].clientY - tY) * 0.28;
    };
    const onTouchEnd = () => scheduleResume();

    // ── Device orientation (Cardboard / phone gyro) ──────────────────────────
    let orientationActive = false;
    const onDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null) return;
      orientationActive = true;
      autoRotate = false;
      lon = -(e.alpha ?? 0);
      lat = (e.beta  ?? 0) - 90;
    };

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    // ── Bind ─────────────────────────────────────────────────────────────────
    mount.addEventListener("pointerdown", onPointerDown);
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerup",   onPointerUp);
    mount.addEventListener("touchstart",  onTouchStart, { passive: true });
    mount.addEventListener("touchmove",   onTouchMove,  { passive: true });
    mount.addEventListener("touchend",    onTouchEnd);
    window.addEventListener("deviceorientation", onDeviceOrientation);
    window.addEventListener("resize", onResize);

    // ── Render loop ──────────────────────────────────────────────────────────
    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (autoRotate && !orientationActive) lon += autoRotateSpeed;
      applyLook();
      if (video.readyState >= video.HAVE_CURRENT_DATA) texture.needsUpdate = true;
      renderer.render(scene, camera);
    };
    animate();

    // Autoplay when ready
    video.play().then(() => setStatus("playing")).catch(() => {});

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resumeTimer);
      video.pause();
      if (hls) { hls.destroy(); hls = null; }
      video.src = "";
      mount.removeEventListener("pointerdown", onPointerDown);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerup",   onPointerUp);
      mount.removeEventListener("touchstart",  onTouchStart);
      mount.removeEventListener("touchmove",   onTouchMove);
      mount.removeEventListener("touchend",    onTouchEnd);
      window.removeEventListener("deviceorientation", onDeviceOrientation);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geo.dispose();
      material.dispose();
      texture.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [videoSrc, autoRotateSpeed, fov]);

  // Update video volume whenever prop changes — no need to rebuild the scene
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = volume <= 0;
    video.volume = Math.max(0, Math.min(1, volume));
  }, [volume]);

  return (
    <div className="absolute inset-0" style={{ touchAction: "none" }}>
      {/* Three.js canvas mount */}
      <div
        ref={mountRef}
        className="absolute inset-0"
        style={{ cursor: "grab" }}
        onPointerDown={(e) => (e.currentTarget.style.cursor = "grabbing")}
        onPointerUp={(e)   => (e.currentTarget.style.cursor = "grab")}
      />

      {/* Loading overlay — shown while video buffers */}
      {status === "loading" && !missing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
          style={{ background: "rgba(5,13,26,0.85)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ border: `2px solid ${accentColor}`, background: `${accentColor}18`,
              animation: "pulse-glow 1.5s ease-in-out infinite" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke={accentColor} strokeWidth="2" strokeLinecap="round">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
          <p className="font-display text-sm tracking-widest uppercase"
            style={{ color: accentColor }}>Memuatkan Video VR 360°…</p>
          <p className="text-slate-500 text-xs mt-1">Loading 360° VR video</p>
          <div className="flex gap-1.5 mt-4">
            {[0,1,2,3].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full"
                style={{ background: accentColor,
                  animation: `pulse-glow 1.1s ${i * 0.18}s infinite` }}/>
            ))}
          </div>
        </div>
      )}

      {/* Missing file placeholder */}
      {missing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none px-8 text-center"
          style={{ background: "rgba(5,13,26,0.92)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-white font-display text-base mb-2">Video VR Tidak Dapat Dimuatkan</p>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            {videoSrc.includes("m3u8") ? "Ralat sambungan ke strim video." : "Fail video tidak ditemui dalam folder public/."}
          </p>
          <div className="text-left w-full max-w-xs p-4 rounded-xl"
            style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <p className="text-emerald-400 text-xs font-mono mb-2 uppercase tracking-wider">Sumber video:</p>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#ef4444" }}/>
              <span className="text-xs font-mono text-white break-all leading-relaxed">{videoSrc}</span>
            </div>
          </div>
          <p className="text-slate-600 text-xs mt-4">
            Format disokong: MP4 (H.264), HLS (.m3u8) · Resolusi: 4K atau 2K
          </p>
        </div>
      )}
    </div>
  );
}
