/**
 * useProctoring — comprehensive multi-layer anti-cheat detection hook
 *
 * Detection layers:
 *   1. Browser Events   : tab-switch, window-blur, fullscreen-exit,
 *                         copy, paste, right-click, keyboard shortcuts
 *   2. Typing Analysis  : instant-paste detection (sudden char burst)
 *   3. Camera Analysis  : dark-frame (covered), static-frame (fake video),
 *                         skin-tone heuristic, built-in FaceDetector API
 *                         (face count → no-face / multiple-faces, head-pose)
 *   4. Object Detection : COCO-SSD via TensorFlow.js
 *                         phone, book/notebook, laptop, extra person
 *   5. Audio Analysis   : Web Audio API microphone volume threshold
 *                         (background voice / noise)
 *   6. Electron IPC     : DevTools open check (heartbeat every 10 s)
 *
 * Every violation is:
 *   - Throttled    — same type fires at most once per THROTTLE_MS
 *   - Snapshotted  — JPEG frame captured from webcam (where relevant)
 *   - Reported     — POST /monitor/:examId/violation
 */

import { useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import api from '../api/axios';

// ─── Timing constants ──────────────────────────────────────────────────────
const FACE_SCAN_INTERVAL_MS   = 5_000;   // run face+object scan every 5 s
const OBJECT_SCAN_INTERVAL_MS = 10_000;  // run COCO-SSD every 10 s
const AUDIO_CHECK_INTERVAL_MS = 3_000;   // audio level check every 3 s
const IPC_CHECK_INTERVAL_MS   = 10_000;  // DevTools heartbeat every 10 s
const THROTTLE_MS             = 15_000;  // same type: max 1 report per 15 s
const AUDIO_NOISE_THRESHOLD   = 20;      // 0-255 RMS; above = noise detected
const PASTE_BURST_CHARS       = 15;      // chars added in one event = paste
const STATIC_FRAME_THRESHOLD  = 3;       // consecutive identical frames = fake

// ─── COCO-SSD model (module-level cache) ──────────────────────────────────
let cocoModel   = null;
let cocoLoading = false;

async function loadCocoModel() {
  if (cocoModel)   return cocoModel;
  if (cocoLoading) return null;          // already loading — skip this tick
  cocoLoading = true;
  try {
    await tf.ready();
    cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
  } catch {
    cocoModel = null;
  } finally {
    cocoLoading = false;
  }
  return cocoModel;
}

// ─── Built-in FaceDetector availability check ────────────────────────────
const FACE_DETECTOR_SUPPORTED =
  typeof window !== 'undefined' && 'FaceDetector' in window;

// ─────────────────────────────────────────────────────────────────────────────

export function useProctoring({
  webcamStreamRef,
  examId,
  candidateId,
  candidateName,
  enabled = true,
}) {
  const videoRef         = useRef(null);   // hidden <video> for frame capture
  const lastReported     = useRef({});     // type → last report timestamp
  const lastFrameHash    = useRef(null);   // for static-frame detection
  const staticCount      = useRef(0);      // consecutive identical frames
  const audioAnalyserRef = useRef(null);   // Web Audio AnalyserNode
  const audioStreamRef   = useRef(null);   // separate mic stream for audio
  const lastCharCount    = useRef(0);      // for paste-burst detection

  // ── Hidden video element that mirrors the webcam stream ────────────────
  useEffect(() => {
    const video = document.createElement('video');
    video.autoplay    = true;
    video.muted       = true;
    video.playsInline = true;
    video.style.cssText =
      'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px';
    document.body.appendChild(video);
    videoRef.current = video;
    return () => {
      document.body.removeChild(video);
      videoRef.current = null;
    };
  }, []);

  // Attach webcam stream once available
  useEffect(() => {
    const id = setInterval(() => {
      if (
        webcamStreamRef.current &&
        videoRef.current &&
        !videoRef.current.srcObject
      ) {
        videoRef.current.srcObject = webcamStreamRef.current;
      }
    }, 500);
    return () => clearInterval(id);
  }, [webcamStreamRef]);

  // ── Frame capture helper ───────────────────────────────────────────────
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.srcObject || video.videoWidth === 0) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch {
      return null;
    }
  }, []);

  // Returns an ImageData pixel array from the hidden video (for analysis)
  const getPixelData = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.srcObject || video.videoWidth === 0) return null;
    try {
      const w = Math.min(video.videoWidth,  320);
      const h = Math.min(video.videoHeight, 240);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);
      return ctx.getImageData(0, 0, w, h);
    } catch {
      return null;
    }
  }, []);

  // ── Throttled violation reporter ──────────────────────────────────────
  const report = useCallback(
    async ({ type, severity, description, withSnapshot = true }) => {
      if (!enabled) return;
      const now  = Date.now();
      const last = lastReported.current[type] || 0;
      if (now - last < THROTTLE_MS) return;
      lastReported.current[type] = now;

      const frameSnapshot = withSnapshot ? captureFrame() : undefined;
      try {
        await api.post(`/monitor/${examId}/violation`, {
          candidateId,
          candidateName,
          type,
          severity,
          description,
          ...(frameSnapshot ? { frameSnapshot } : {}),
        });
      } catch {
        // Silently ignore — exam must not be interrupted by network errors
      }
    },
    [enabled, examId, candidateId, candidateName, captureFrame],
  );

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 1 — Browser events
  // ══════════════════════════════════════════════════════════════════════════

  // Tab switch
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      if (document.hidden) {
        report({
          type: 'tab-switch', severity: 'high',
          description: 'Student navigated away from the exam tab',
        });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [enabled, report]);

  // Window / app focus lost
  useEffect(() => {
    if (!enabled) return;
    const handler = () => report({
      type: 'window-blur', severity: 'medium',
      description: 'Exam window lost focus — another application may have been opened',
    });
    window.addEventListener('blur', handler);
    return () => window.removeEventListener('blur', handler);
  }, [enabled, report]);

  // Fullscreen exit
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      if (!document.fullscreenElement) {
        report({
          type: 'fullscreen-exit', severity: 'medium',
          description: 'Student exited fullscreen mode',
          withSnapshot: false,
        });
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [enabled, report]);

  // Copy / Paste (block + report)
  useEffect(() => {
    if (!enabled) return;
    const onCopy = (e) => {
      e.preventDefault();
      report({ type: 'copy-attempt', severity: 'medium', description: 'Text copy attempt blocked', withSnapshot: false });
    };
    const onPaste = (e) => {
      e.preventDefault();
      report({ type: 'paste-attempt', severity: 'medium', description: 'Text paste attempt blocked', withSnapshot: false });
    };
    document.addEventListener('copy',  onCopy);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('copy',  onCopy);
      document.removeEventListener('paste', onPaste);
    };
  }, [enabled, report]);

  // Right-click
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      e.preventDefault();
      report({ type: 'right-click', severity: 'low', description: 'Right-click context menu blocked', withSnapshot: false });
    };
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, [enabled, report]);

  // Blocked keyboard shortcuts (DevTools, PrintScreen, select-all, view-source…)
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      const ctrl  = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key   = e.key.toLowerCase();

      const blocked =
        (ctrl && ['c', 'v', 'a', 'u', 's', 'p'].includes(key))    ||
        (ctrl && shift && ['i', 'j', 'c', 'k'].includes(key))      ||
        e.key === 'F12'          ||
        e.key === 'PrintScreen'  ||
        e.key === 'F11';

      if (blocked) {
        e.preventDefault();
        report({
          type: 'keyboard-shortcut', severity: 'low',
          description: `Blocked shortcut: ${ctrl ? 'Ctrl+' : ''}${shift ? 'Shift+' : ''}${e.key}`,
          withSnapshot: false,
        });
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled, report]);

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 2 — Typing / paste-burst analysis
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!enabled) return;

    const handler = (e) => {
      const el = e.target;
      if (!el || typeof el.value !== 'string') return;
      const newLen = el.value.length;
      const delta  = newLen - lastCharCount.current;
      lastCharCount.current = newLen;

      if (delta >= PASTE_BURST_CHARS) {
        report({
          type: 'paste-attempt', severity: 'medium',
          description: `Sudden text burst detected (${delta} characters added at once) — possible paste`,
          withSnapshot: false,
        });
      }
    };

    document.addEventListener('input', handler, true);
    return () => document.removeEventListener('input', handler, true);
  }, [enabled, report]);

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 3 — Camera frame analysis + FaceDetector API
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const analyseFrame = async () => {
      if (cancelled) return;

      const imgData = getPixelData();
      if (!imgData) {
        setTimeout(analyseFrame, FACE_SCAN_INTERVAL_MS);
        return;
      }

      const { data, width, height } = imgData;
      const pixelCount = width * height;

      // ── Dark-frame check (camera covered / lights off) ──────────────
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        totalBrightness += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgBrightness = totalBrightness / pixelCount;
      if (avgBrightness < 15) {
        report({
          type: 'camera-offline', severity: 'high',
          description: 'Camera feed is extremely dark — camera may be covered or disabled',
        });
      }

      // ── Static-frame check (fake / frozen video) ────────────────────
      // Simple hash: sum of sampled pixel values
      let frameHash = 0;
      for (let i = 0; i < data.length; i += 40) {
        frameHash += data[i] + data[i + 1] + data[i + 2];
      }
      if (frameHash === lastFrameHash.current) {
        staticCount.current += 1;
        if (staticCount.current >= STATIC_FRAME_THRESHOLD) {
          report({
            type: 'fake-video', severity: 'high',
            description: 'Camera feed appears frozen — student may be using a pre-recorded video',
          });
        }
      } else {
        staticCount.current = 0;
      }
      lastFrameHash.current = frameHash;

      // ── Skin-tone heuristic (face presence rough check) ─────────────
      let skinPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // Simplified Kovac skin-tone filter
        if (
          r > 95 && g > 40 && b > 20 &&
          r - Math.min(g, b) > 15 &&
          Math.abs(r - g) > 15 &&
          r > g && r > b
        ) {
          skinPixels++;
        }
      }
      const skinRatio = skinPixels / pixelCount;
      if (avgBrightness >= 15 && skinRatio < 0.03) {
        // Very few skin-tone pixels but not dark — face likely absent
        report({
          type: 'face-not-visible', severity: 'high',
          description: 'No face detected in camera — student may have moved away',
        });
      }

      // ── Built-in FaceDetector API ────────────────────────────────────
      if (FACE_DETECTOR_SUPPORTED && videoRef.current?.videoWidth > 0) {
        try {
          const detector  = new window.FaceDetector({ fastMode: true });
          const faces     = await detector.detect(videoRef.current);

          if (faces.length === 0) {
            report({
              type: 'face-not-visible', severity: 'high',
              description: 'No face detected by FaceDetector API',
            });
          } else if (faces.length > 1) {
            report({
              type: 'multiple-faces', severity: 'high',
              description: `${faces.length} faces detected — possible assistance from another person`,
            });
          } else if (faces.length === 1) {
            // Head pose from bounding box position in frame
            const box      = faces[0].boundingBox;
            const centerX  = box.x + box.width  / 2;
            const centerY  = box.y + box.height / 2;
            const frameW   = videoRef.current.videoWidth;
            const frameH   = videoRef.current.videoHeight;

            const xRatio = centerX / frameW;
            const yRatio = centerY / frameH;

            if (yRatio > 0.70) {
              report({
                type: 'looking-down', severity: 'medium',
                description: 'Student appears to be looking down — possible phone or notes use',
              });
            } else if (xRatio < 0.25 || xRatio > 0.75) {
              report({
                type: 'looking-sideways', severity: 'medium',
                description: 'Student appears to be looking sideways — possible use of another screen',
              });
            }
          }
        } catch {
          // FaceDetector error — skip
        }
      }

      if (!cancelled) setTimeout(analyseFrame, FACE_SCAN_INTERVAL_MS);
    };

    analyseFrame();
    return () => { cancelled = true; };
  }, [enabled, report, getPixelData]);

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 4 — COCO-SSD object detection (phone, book, laptop, person)
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const runDetection = async () => {
      if (cancelled) return;

      const video = videoRef.current;
      if (!video || !video.srcObject || video.videoWidth === 0) {
        if (!cancelled) setTimeout(runDetection, OBJECT_SCAN_INTERVAL_MS);
        return;
      }

      const model = await loadCocoModel();
      if (!model || cancelled) {
        if (!cancelled) setTimeout(runDetection, OBJECT_SCAN_INTERVAL_MS);
        return;
      }

      try {
        const predictions = await model.detect(video);

        const classes = predictions.map((p) => p.class.toLowerCase());

        if (classes.includes('cell phone') || classes.includes('remote')) {
          report({
            type: 'phone-detected', severity: 'high',
            description: 'Mobile phone detected in camera — possible cheating with phone',
          });
        }

        if (classes.includes('book') || classes.includes('notebook')) {
          report({
            type: 'notes-detected', severity: 'high',
            description: 'Book or notebook detected — possible use of reference material',
          });
        }

        if (classes.includes('laptop') || classes.includes('tv') || classes.includes('monitor')) {
          report({
            type: 'second-device', severity: 'high',
            description: 'Additional screen/device detected in camera',
          });
        }

        const personCount = classes.filter((c) => c === 'person').length;
        if (personCount > 1) {
          report({
            type: 'multiple-persons', severity: 'high',
            description: `${personCount} people detected — possible impersonation or assistance`,
          });
        }
      } catch {
        // Detection error — skip this tick
      }

      if (!cancelled) setTimeout(runDetection, OBJECT_SCAN_INTERVAL_MS);
    };

    runDetection();
    return () => { cancelled = true; };
  }, [enabled, report]);

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 5 — Web Audio API (microphone noise / voice detection)
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!enabled) return;
    let cancelled   = false;
    let intervalId  = null;

    const setupAudio = async () => {
      try {
        const stream  = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioStreamRef.current = stream;

        const ctx      = new AudioContext();
        const source   = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioAnalyserRef.current = analyser;

        const buf = new Uint8Array(analyser.frequencyBinCount);

        intervalId = setInterval(() => {
          if (cancelled) return;
          analyser.getByteFrequencyData(buf);
          const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
          if (rms > AUDIO_NOISE_THRESHOLD) {
            report({
              type: 'background-noise', severity: 'low',
              description: `Background noise/voice detected (level ${Math.round(rms)})`,
              withSnapshot: true,
            });
          }
        }, AUDIO_CHECK_INTERVAL_MS);
      } catch {
        // Microphone not available — skip audio layer
      }
    };

    setupAudio();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioStreamRef.current   = null;
      audioAnalyserRef.current = null;
    };
  }, [enabled, report]);

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 6 — Electron IPC (DevTools open check)
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!enabled) return;

    const electronAPI = window.__electronAPI;
    if (!electronAPI?.checkIntegrity) return;  // not running inside Electron

    const id = setInterval(async () => {
      try {
        const { devToolsOpen } = await electronAPI.checkIntegrity();
        if (devToolsOpen) {
          report({
            type: 'devtools', severity: 'high',
            description: 'Developer Tools opened during exam',
            withSnapshot: false,
          });
        }
      } catch {
        // IPC error — skip
      }
    }, IPC_CHECK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [enabled, report]);
}
