import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const REASON_META = {
  'tab-switch':        { label: 'Tab Switch',           color: 'bg-yellow-100 text-yellow-700' },
  'window-blur':       { label: 'Window Switched',      color: 'bg-yellow-100 text-yellow-700' },
  'fullscreen-exit':   { label: 'Fullscreen Exit',      color: 'bg-yellow-100 text-yellow-700' },
  'face-not-visible':  { label: 'No Face Detected',     color: 'bg-red-100 text-red-700'       },
  'multiple-faces':    { label: 'Multiple Faces',       color: 'bg-red-100 text-red-700'       },
  'multiple-persons':  { label: 'Multiple Persons',     color: 'bg-red-100 text-red-700'       },
  'camera-offline':    { label: 'Camera Covered',       color: 'bg-gray-100 text-gray-600'     },
  'fake-video':        { label: 'Fake/Frozen Video',    color: 'bg-red-100 text-red-700'       },
  'looking-down':      { label: 'Looking Down',         color: 'bg-amber-100 text-amber-700'   },
  'looking-sideways':  { label: 'Looking Sideways',     color: 'bg-amber-100 text-amber-700'   },
  'phone-detected':    { label: 'Phone Detected',       color: 'bg-red-100 text-red-700'       },
  'notes-detected':    { label: 'Notes/Book Detected',  color: 'bg-red-100 text-red-700'       },
  'second-device':     { label: 'Second Device',        color: 'bg-red-100 text-red-700'       },
  'copy-attempt':      { label: 'Copy Attempt',         color: 'bg-orange-100 text-orange-700' },
  'paste-attempt':     { label: 'Paste Attempt',        color: 'bg-orange-100 text-orange-700' },
  'right-click':       { label: 'Right-click',          color: 'bg-gray-100 text-gray-600'     },
  'keyboard-shortcut': { label: 'Keyboard Shortcut',    color: 'bg-gray-100 text-gray-600'     },
  'background-noise':  { label: 'Background Noise',     color: 'bg-amber-100 text-amber-700'   },
  'devtools':          { label: 'DevTools Opened',      color: 'bg-orange-100 text-orange-700' },
  'proctor-warning':   { label: 'Proctor Warning',      color: 'bg-indigo-100 text-indigo-700' },
};

const SEVERITY_STYLE = {
  high:   { badge: 'bg-red-100 text-red-700',    border: 'border-red-200'   },
  medium: { badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
  low:    { badge: 'bg-gray-100 text-gray-600',   border: 'border-gray-200'  },
};

const CHUNK_DURATION_S = 30; // must match CHUNK_INTERVAL_MS / 1000 in useRecording.js

function getMeta(type) {
  return REASON_META[type] || { label: type, color: 'bg-gray-100 text-gray-600' };
}

function formatOffset(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export default function ViolationReview() {
  const { examId, studentId } = useParams();
  const navigate = useNavigate();

  const [violations, setViolations]       = useState([]);
  const [recordings, setRecordings]       = useState([]);   // ordered chunk URLs
  const [startedAt, setStartedAt]         = useState(null); // ISO string from session
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');
  const [activeTab, setActiveTab]         = useState('violations'); // 'violations' | 'recording'
  const [lightbox, setLightbox]           = useState(null);
  const [currentChunk, setCurrentChunk]   = useState(0);
  const [pendingSeek, setPendingSeek]     = useState(null); // seconds within current chunk
  const [videoCurrentTime, setVideoCurrentTime] = useState(0); // live time within active chunk

  const videoRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get(`/monitor/${examId}/violations/${studentId}`),
      api.get(`/monitor/${examId}/recordings/${studentId}`),
      api.get(`/monitor/${examId}/sessions`),
    ])
      .then(([vRes, rRes, sRes]) => {
        setViolations(vRes.data);
        setRecordings(rRes.data ?? []);
        const session = (sRes.data ?? []).find(
          (s) => String(s.candidateId) === String(studentId),
        );
        if (session?.startedAt) setStartedAt(session.startedAt);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [examId, studentId]);

  // Apply pending seek after the video's src changes and metadata loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video || pendingSeek === null) return;
    const onLoaded = () => {
      video.currentTime = pendingSeek;
      setPendingSeek(null);
      video.play().catch(() => {});
    };
    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    return () => video.removeEventListener('loadedmetadata', onLoaded);
  }, [currentChunk, pendingSeek]);

  // Seek to the recording moment when a violation is clicked
  const seekToViolation = useCallback(
    (violation) => {
      if (!startedAt || recordings.length === 0) return;
      const offsetSeconds = (new Date(violation.createdAt) - new Date(startedAt)) / 1000;
      if (offsetSeconds < 0) return;
      const chunkIndex    = Math.min(
        Math.floor(offsetSeconds / CHUNK_DURATION_S),
        recordings.length - 1,
      );
      const seekWithin    = offsetSeconds - chunkIndex * CHUNK_DURATION_S;

      setActiveTab('recording');

      if (chunkIndex === currentChunk && videoRef.current) {
        videoRef.current.currentTime = seekWithin;
        videoRef.current.play().catch(() => {});
      } else {
        setCurrentChunk(chunkIndex);
        setPendingSeek(seekWithin);
      }
    },
    [startedAt, recordings, currentChunk],
  );

  const photoCount = violations.filter((v) => v.snapshotUrl).length;
  const highCount  = violations.filter((v) => v.severity === 'high').length;

  const filtered = violations.filter((v) => {
    if (filter === 'photos') return !!v.snapshotUrl;
    if (filter === 'high')   return v.severity === 'high';
    return true;
  });

  // Violations with a computable recording offset (for seek buttons)
  const violationsWithOffset = violations.map((v) => ({
    ...v,
    offsetSeconds: startedAt
      ? (new Date(v.createdAt) - new Date(startedAt)) / 1000
      : null,
  }));

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(`/exams/${examId}/results`)}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Results
        </button>
        <span className="text-gray-300">|</span>
        <h1 className="text-base font-semibold text-gray-900">Violation Review</h1>
        <span className="text-xs text-gray-400">
          {violations.length} violation{violations.length !== 1 ? 's' : ''}
          {photoCount > 0 && ` · ${photoCount} with photos`}
          {recordings.length > 0 && ` · ${recordings.length} recording chunk${recordings.length !== 1 ? 's' : ''}`}
        </span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {loading && (
          <p className="text-center text-sm text-gray-400 py-16">Loading…</p>
        )}

        {!loading && (
          <>
            {/* Top-level tabs: Violations / Recording */}
            <div className="flex gap-1 mb-6 border-b border-gray-200">
              {[
                ['violations', `Violations (${violations.length})`],
                ['recording',  `Recording (${recordings.length} chunk${recordings.length !== 1 ? 's' : ''})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── VIOLATIONS TAB ── */}
            {activeTab === 'violations' && (
              <>
                {violations.length === 0 && (
                  <div className="text-center py-20 text-gray-400">
                    <p className="text-5xl mb-4">✅</p>
                    <p className="text-sm font-medium">No violations recorded for this student.</p>
                  </div>
                )}

                {violations.length > 0 && (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="rounded-xl bg-white border border-gray-200 p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-gray-900">{violations.length}</div>
                        <div className="text-xs text-gray-500 mt-1">Total</div>
                      </div>
                      <div className="rounded-xl bg-white border border-red-200 p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-red-600">{highCount}</div>
                        <div className="text-xs text-gray-500 mt-1">High Severity</div>
                      </div>
                      <div className="rounded-xl bg-white border border-gray-200 p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-indigo-600">{photoCount}</div>
                        <div className="text-xs text-gray-500 mt-1">With Snapshots</div>
                      </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-1 mb-6 border-b border-gray-200">
                      {[
                        ['all',    `All (${violations.length})`],
                        ['photos', `Snapshots (${photoCount})`],
                        ['high',   `High Severity (${highCount})`],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setFilter(key)}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            filter === key
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {filtered.length === 0 && (
                      <p className="text-center text-sm text-gray-400 py-12">No violations match this filter.</p>
                    )}

                    {/* Photo grid */}
                    {filter === 'photos' && filtered.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                        {filtered.map((v) => {
                          const meta = getMeta(v.type);
                          return (
                            <div key={v._id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                              <div
                                className="relative group cursor-pointer"
                                onClick={() => setLightbox(v.snapshotUrl)}
                              >
                                <img
                                  src={v.snapshotUrl}
                                  alt={v.type}
                                  className="w-full object-cover aspect-video"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 bg-black/50 px-2 py-1 rounded">
                                    View full size
                                  </span>
                                </div>
                              </div>
                              <div className="px-3 py-2">
                                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${meta.color}`}>
                                  {meta.label}
                                </span>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(v.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Violations list */}
                    {filter !== 'photos' && (
                      <div className="space-y-2">
                        {filtered.map((v) => {
                          const meta       = getMeta(v.type);
                          const sevStyle   = SEVERITY_STYLE[v.severity] || SEVERITY_STYLE.low;
                          const withOffset = violationsWithOffset.find((w) => w._id === v._id);
                          const canSeek    = recordings.length > 0 && withOffset?.offsetSeconds != null && withOffset.offsetSeconds >= 0;
                          return (
                            <div
                              key={v._id}
                              className={`rounded-xl border bg-white overflow-hidden shadow-sm ${sevStyle.border}`}
                            >
                              <div className="flex items-start gap-4 p-4">

                                {/* Thumbnail */}
                                {v.snapshotUrl && (
                                  <img
                                    src={v.snapshotUrl}
                                    alt="snapshot"
                                    onClick={() => setLightbox(v.snapshotUrl)}
                                    className="w-28 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                  />
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${meta.color}`}>
                                      {meta.label}
                                    </span>
                                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${sevStyle.badge}`}>
                                      {v.severity}
                                    </span>
                                    {canSeek && (
                                      <span className="text-xs text-gray-400 font-mono">
                                        @ {formatOffset(withOffset.offsetSeconds)}
                                      </span>
                                    )}
                                  </div>
                                  {v.description && (
                                    <p className="text-xs text-gray-500 mt-1">{v.description}</p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(v.createdAt).toLocaleString()}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {canSeek && (
                                    <button
                                      onClick={() => seekToViolation(v)}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
                                      title="Jump to this moment in the recording"
                                    >
                                      ▶ Jump to
                                    </button>
                                  )}
                                  {v.snapshotUrl && (
                                    <button
                                      onClick={() => setLightbox(v.snapshotUrl)}
                                      className="text-xs text-indigo-600 hover:text-indigo-800"
                                    >
                                      View photo
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── RECORDING TAB ── */}
            {activeTab === 'recording' && (() => {
              const totalDuration  = recordings.length * CHUNK_DURATION_S;
              const globalPosition = currentChunk * CHUNK_DURATION_S + videoCurrentTime;
              const scrubPct       = totalDuration > 0 ? (globalPosition / totalDuration) * 100 : 0;

              const handleScrub = (e) => {
                const pct           = Number(e.target.value);
                const targetSeconds = (pct / 100) * totalDuration;
                const chunkIndex    = Math.min(
                  Math.floor(targetSeconds / CHUNK_DURATION_S),
                  recordings.length - 1,
                );
                const seekWithin = targetSeconds - chunkIndex * CHUNK_DURATION_S;
                if (chunkIndex === currentChunk && videoRef.current) {
                  videoRef.current.currentTime = seekWithin;
                } else {
                  setCurrentChunk(chunkIndex);
                  setPendingSeek(seekWithin);
                }
              };

              const timedViolations = violationsWithOffset
                .filter((v) => v.offsetSeconds != null && v.offsetSeconds >= 0 && totalDuration > 0);

              return (
              <div className="flex gap-6">

                {/* Video + scrubber column */}
                <div className="flex-1 min-w-0">
                  {recordings.length === 0 ? (
                    <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 bg-white text-center text-sm text-gray-400">
                      No recording available for this student.
                    </div>
                  ) : (
                    <>
                      {/* Video — native controls for play/pause/volume only */}
                      <video
                        ref={videoRef}
                        key={recordings[currentChunk]}
                        src={recordings[currentChunk]}
                        controls
                        autoPlay={pendingSeek !== null}
                        onTimeUpdate={() => setVideoCurrentTime(videoRef.current?.currentTime ?? 0)}
                        onEnded={() => {
                          if (currentChunk < recordings.length - 1) {
                            setCurrentChunk((c) => c + 1);
                            setVideoCurrentTime(0);
                          }
                        }}
                        className="w-full rounded-xl bg-black shadow"
                        style={{ '--webkit-media-controls-timeline': 'none' }}
                      />

                      {/* ── Global scrubber ── */}
                      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">

                        {/* Time labels */}
                        <div className="flex justify-between text-xs text-gray-400 font-mono mb-2">
                          <span>{formatOffset(globalPosition)}</span>
                          <span>{formatOffset(totalDuration)}</span>
                        </div>

                        {/* Track + markers + input */}
                        <div className="relative h-6 flex items-center">

                          {/* Track background */}
                          <div className="absolute inset-x-0 h-2 rounded-full bg-gray-200" />

                          {/* Filled portion */}
                          <div
                            className="absolute left-0 h-2 rounded-full bg-indigo-500 pointer-events-none"
                            style={{ width: `${scrubPct}%` }}
                          />

                          {/* Chunk boundary ticks */}
                          {recordings.slice(0, -1).map((_, i) => {
                            const tickPct = ((i + 1) * CHUNK_DURATION_S / totalDuration) * 100;
                            return (
                              <div
                                key={i}
                                className="absolute w-px h-3 bg-gray-400/50 pointer-events-none"
                                style={{ left: `${tickPct}%`, top: '50%', transform: 'translateY(-50%)' }}
                              />
                            );
                          })}

                          {/* Violation markers */}
                          {timedViolations.map((v) => {
                            const pct = Math.min((v.offsetSeconds / totalDuration) * 100, 99.5);
                            const dot =
                              v.severity === 'high'   ? 'bg-red-500'   :
                              v.severity === 'medium' ? 'bg-amber-400' : 'bg-gray-400';
                            return (
                              <div
                                key={v._id}
                                onClick={() => seekToViolation(v)}
                                title={`${getMeta(v.type).label} @ ${formatOffset(v.offsetSeconds)}`}
                                className={`absolute w-3 h-3 rounded-full border-2 border-white cursor-pointer z-10 hover:scale-125 transition-transform ${dot}`}
                                style={{
                                  left: `${pct}%`,
                                  top: '50%',
                                  transform: 'translate(-50%, -50%)',
                                }}
                              />
                            );
                          })}

                          {/* Playhead */}
                          <div
                            className="absolute w-4 h-4 rounded-full bg-white border-2 border-indigo-600 shadow pointer-events-none z-20"
                            style={{
                              left: `${scrubPct}%`,
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                            }}
                          />

                          {/* Invisible range input stretched over the track */}
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={0.1}
                            value={scrubPct}
                            onChange={handleScrub}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer z-30"
                          />
                        </div>

                        {/* Chunk label */}
                        <div className="mt-2 text-center text-xs text-gray-400">
                          Segment {currentChunk + 1}/{recordings.length}
                          &nbsp;·&nbsp;
                          {formatOffset(currentChunk * CHUNK_DURATION_S)}
                          {' – '}
                          {formatOffset((currentChunk + 1) * CHUNK_DURATION_S)}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Violation timeline list */}
                <div className="w-60 flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Violations
                  </p>
                  {timedViolations.length === 0 ? (
                    <p className="text-xs text-gray-400">No violations.</p>
                  ) : (
                    <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
                      {[...timedViolations]
                        .sort((a, b) => a.offsetSeconds - b.offsetSeconds)
                        .map((v) => {
                          const meta     = getMeta(v.type);
                          const sevStyle = SEVERITY_STYLE[v.severity] || SEVERITY_STYLE.low;
                          const isActive =
                            Math.floor(v.offsetSeconds / CHUNK_DURATION_S) === currentChunk &&
                            Math.abs(v.offsetSeconds - globalPosition) < CHUNK_DURATION_S;
                          return (
                            <button
                              key={v._id}
                              onClick={() => seekToViolation(v)}
                              className={`w-full text-left rounded-lg border p-2 transition-colors text-xs
                                ${isActive
                                  ? 'border-indigo-300 bg-indigo-50'
                                  : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className={`rounded-full px-1.5 py-0.5 font-medium text-[10px] ${meta.color}`}>
                                  {meta.label}
                                </span>
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${sevStyle.badge}`}>
                                  {v.severity}
                                </span>
                              </div>
                              <div className="text-gray-500 font-mono mt-0.5">
                                {formatOffset(v.offsetSeconds)}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="violation snapshot"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 text-white text-3xl leading-none hover:text-gray-300"
          >
            ×
          </button>
          <a
            href={lightbox}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-5 right-5 text-xs text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg"
          >
            Open full size
          </a>
        </div>
      )}
    </div>
  );
}
