/**
 * useRecording — captures the candidate's webcam + microphone as chunked WebM files
 * and uploads each chunk directly to S3 via a presigned PUT URL.
 *
 * Flow per chunk:
 *   1. GET /monitor/:examId/recording/upload-url  → { uploadUrl, publicUrl }
 *   2. PUT  uploadUrl  (binary WebM blob, direct to S3)
 *   3. POST /monitor/:examId/recording/chunk-saved  { candidateId, publicUrl }
 *
 * Failed chunks are queued and retried every RETRY_INTERVAL_MS.
 * Audio and video are captured in a single combined stream — no separate audio upload needed.
 */

import { useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

const CHUNK_INTERVAL_MS  = 30_000;          // flush a chunk every 30 s
const RETRY_INTERVAL_MS  = 60_000;          // retry failed chunks every 60 s
const RETRY_MAX          = 50;              // cap the retry queue

// Prefer VP8+Opus WebM; fall back to plain WebM
const MIME_TYPE = (() => {
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  const preferred = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];
  return preferred.find((m) => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';
})();

export function useRecording({ examId, candidateId, enabled = true }) {
  const recorderRef    = useRef(null);
  const chunkIndexRef  = useRef(0);
  const retryQueueRef  = useRef([]);   // [{ blob, chunkIndex }]
  const streamRef      = useRef(null); // combined audio+video stream

  // ── Upload one chunk to S3 via presigned URL ─────────────────────────────
  const uploadChunk = useCallback(
    async (blob, chunkIndex) => {
      try {
        // Step 1: get presigned PUT URL
        const { data } = await api.get(
          `/monitor/${examId}/recording/upload-url`,
          { params: { candidateId, chunkIndex } },
        );
        if (!data?.uploadUrl) throw new Error('No uploadUrl returned');

        // Step 2: upload blob directly to S3 (no auth header — presigned URL is self-contained)
        const res = await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': MIME_TYPE },
          body: blob,
        });
        if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);

        // Step 3: notify backend to persist the public URL
        await api.post(`/monitor/${examId}/recording/chunk-saved`, {
          candidateId,
          publicUrl: data.publicUrl,
        });
      } catch {
        // Queue for retry
        if (retryQueueRef.current.length < RETRY_MAX) {
          retryQueueRef.current.push({ blob, chunkIndex });
        }
      }
    },
    [examId, candidateId],
  );

  // ── Retry queue ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(async () => {
      if (retryQueueRef.current.length === 0) return;
      const batch  = retryQueueRef.current.splice(0);
      const failed = [];
      for (const item of batch) {
        try {
          const { data } = await api.get(
            `/monitor/${examId}/recording/upload-url`,
            { params: { candidateId, chunkIndex: item.chunkIndex } },
          );
          if (!data?.uploadUrl) throw new Error('No uploadUrl');

          const res = await fetch(data.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': MIME_TYPE },
            body: item.blob,
          });
          if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);

          await api.post(`/monitor/${examId}/recording/chunk-saved`, {
            candidateId,
            publicUrl: data.publicUrl,
          });
        } catch {
          failed.push(item);
        }
      }
      const room = RETRY_MAX - retryQueueRef.current.length;
      retryQueueRef.current.unshift(...failed.slice(0, room));
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, examId, candidateId]);

  // ── MediaRecorder setup ───────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || typeof MediaRecorder === 'undefined') return;
    let stopped = false;

    const start = async () => {
      try {
        // Combined video + audio stream — no separate audio upload needed
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 15 },
          audio: true,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const recorder = new MediaRecorder(stream, { mimeType: MIME_TYPE });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            uploadChunk(e.data, chunkIndexRef.current++);
          }
        };

        recorder.onerror = () => {
          // Recorder error — stop silently; cleanup handles teardown
        };

        recorder.start(CHUNK_INTERVAL_MS);
      } catch {
        // Camera/mic not available or MediaRecorder unsupported — skip recording
      }
    };

    start();

    return () => {
      stopped = true;
      // Request final chunk before stopping
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.requestData();
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      streamRef.current   = null;
    };
  }, [enabled, uploadChunk]);
}
