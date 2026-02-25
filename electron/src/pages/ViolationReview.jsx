import { useState, useEffect } from 'react';
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

function getMeta(type) {
  return REASON_META[type] || { label: type, color: 'bg-gray-100 text-gray-600' };
}

export default function ViolationReview() {
  const { examId, studentId } = useParams();
  const navigate = useNavigate();

  const [violations, setViolations] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');   // 'all' | 'photos' | 'high'
  const [lightbox, setLightbox]     = useState(null);    // base64 frameSnapshot

  useEffect(() => {
    api.get(`/monitor/${examId}/violations/${studentId}`)
      .then((r) => setViolations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [examId, studentId]);

  const photoCount = violations.filter((v) => v.frameSnapshot).length;
  const highCount  = violations.filter((v) => v.severity === 'high').length;

  const filtered = violations.filter((v) => {
    if (filter === 'photos') return !!v.frameSnapshot;
    if (filter === 'high')   return v.severity === 'high';
    return true;
  });

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
        </span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {loading && (
          <p className="text-center text-sm text-gray-400 py-16">Loading violations…</p>
        )}

        {!loading && violations.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">✅</p>
            <p className="text-sm font-medium">No violations recorded for this student.</p>
          </div>
        )}

        {!loading && violations.length > 0 && (
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

            {/* Photo grid (Snapshots tab) */}
            {filter === 'photos' && filtered.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {filtered.map((v) => {
                  const meta = getMeta(v.type);
                  return (
                    <div key={v._id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                      <div
                        className="relative group cursor-pointer"
                        onClick={() => setLightbox(v.frameSnapshot)}
                      >
                        <img
                          src={v.frameSnapshot}
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
                  const meta     = getMeta(v.type);
                  const sevStyle = SEVERITY_STYLE[v.severity] || SEVERITY_STYLE.low;
                  return (
                    <div
                      key={v._id}
                      className={`rounded-xl border bg-white overflow-hidden shadow-sm ${sevStyle.border}`}
                    >
                      <div className="flex items-start gap-4 p-4">

                        {/* Thumbnail */}
                        {v.frameSnapshot && (
                          <img
                            src={v.frameSnapshot}
                            alt="snapshot"
                            onClick={() => setLightbox(v.frameSnapshot)}
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
                          </div>
                          {v.description && (
                            <p className="text-xs text-gray-500 mt-1">{v.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(v.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {v.frameSnapshot && (
                          <button
                            onClick={() => setLightbox(v.frameSnapshot)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex-shrink-0"
                          >
                            View photo
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
            download="violation-snapshot.jpg"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-5 right-5 text-xs text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg"
          >
            Download
          </a>
        </div>
      )}
    </div>
  );
}
