import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api/axios';

const WS_URL = 'http://localhost:4000/monitor';

const SEVERITY_BORDER = {
  none: 'border-green-400',
  low: 'border-amber-400',
  medium: 'border-amber-500',
  high: 'border-red-500',
};

const STATUS_BADGE = {
  waiting: 'bg-gray-100 text-gray-500',
  active: 'bg-green-100 text-green-700',
  idle: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  disconnected: 'bg-zinc-100 text-zinc-500',
  terminated: 'bg-red-100 text-red-700',
};

// ── Candidate Tile ────────────────────────────────────────────────────────────

function CandidateTile({ session, frame, selected, onSelect, onClick, selectMode }) {
  const border = SEVERITY_BORDER[session.highestSeverity] || 'border-gray-200';

  return (
    <div
      className={`relative rounded-xl border-2 bg-white overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow ${border}`}
      onClick={() => !selectMode && onClick(session)}
    >
      {/* Select checkbox */}
      {selectMode && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(String(session.candidateId))}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 accent-indigo-600 rounded"
          />
        </div>
      )}

      {/* Violation badge */}
      {session.violationCount > 0 && (
        <div className="absolute top-2 right-2 z-10 rounded-full bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center">
          {session.violationCount}
        </div>
      )}

      {/* Camera feed */}
      <div className="bg-gray-900 aspect-video flex items-center justify-center">
        {frame ? (
          <img src={frame} alt="live feed" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-1">📷</div>
            <div className="text-xs">No feed</div>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{session.candidateName}</span>
          <span className={`text-xs rounded-full px-2 py-0.5 whitespace-nowrap ${STATUS_BADGE[session.status] || STATUS_BADGE.waiting}`}>
            {session.status}
          </span>
        </div>
        <div className="mt-1 text-xs text-gray-400">
          {session.questionsAnswered} / {session.totalQuestions || '?'} answered
          {session.extraTimeMinutes > 0 && (
            <span className="ml-2 text-blue-500">+{session.extraTimeMinutes}m</span>
          )}
        </div>
        {session.hasAccommodation && (
          <div className="mt-0.5 text-xs text-indigo-500">Accommodation applied</div>
        )}
      </div>
    </div>
  );
}

// ── Candidate Detail Drawer ───────────────────────────────────────────────────

function CandidateDrawer({ session, frame, violations, socket, examId, onClose, onSessionUpdate }) {
  const [msgText, setMsgText] = useState('');
  const [extendMinutes, setExtendMinutes] = useState(10);
  const [sending, setSending] = useState(false);

  if (!session) return null;

  const sendMessage = () => {
    if (!msgText.trim()) return;
    socket?.emit('proctor:send_message', {
      examId,
      candidateId: String(session.candidateId),
      message: msgText,
    });
    setMsgText('');
  };

  const sendWarning = () => {
    if (!confirm(`Send a formal warning to ${session.candidateName}?`)) return;
    socket?.emit('proctor:send_warning', {
      examId,
      candidateId: String(session.candidateId),
      candidateName: session.candidateName,
    });
  };

  const extendTime = () => {
    socket?.emit('proctor:extend_time', {
      examId,
      candidateId: String(session.candidateId),
      minutes: extendMinutes,
    });
  };

  const terminate = async () => {
    if (!confirm(`Terminate ${session.candidateName}'s exam? This cannot be undone.`)) return;
    setSending(true);
    try {
      await api.post(`/monitor/${examId}/candidates/${session.candidateId}/terminate`);
      socket?.emit('proctor:terminate', {
        examId,
        candidateId: String(session.candidateId),
      });
      onSessionUpdate(String(session.candidateId), { status: 'terminated' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-20">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{session.candidateName}</h2>
          <p className="text-xs text-gray-400">{session.candidateEmail}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Live feed enlarged */}
        <div className="bg-gray-900 aspect-video">
          {frame ? (
            <img src={frame} alt="live feed" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📷</div>
                <div className="text-sm">No camera feed</div>
              </div>
            </div>
          )}
        </div>

        {/* Status strip */}
        <div className="px-5 py-3 border-b border-gray-100 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-gray-400">Status</div>
            <div className={`text-xs font-medium rounded-full px-2 py-0.5 mt-0.5 ${STATUS_BADGE[session.status] || ''}`}>
              {session.status}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Progress</div>
            <div className="text-sm font-semibold text-gray-800">
              {session.questionsAnswered}/{session.totalQuestions || '?'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Violations</div>
            <div className={`text-sm font-semibold ${session.violationCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {session.violationCount}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</h3>

          {/* Send message */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={sendMessage}
              className="rounded bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700"
            >
              Send
            </button>
          </div>

          {/* Send warning */}
          <button
            onClick={sendWarning}
            className="w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100 text-left"
          >
            ⚠ Send Warning
          </button>

          {/* Extend time */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Extend time</span>
            <input
              type="number"
              min={1}
              max={120}
              value={extendMinutes}
              onChange={(e) => setExtendMinutes(+e.target.value)}
              className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-center"
            />
            <span className="text-sm text-gray-500">min</span>
            <button
              onClick={extendTime}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
            >
              Apply
            </button>
          </div>

          {/* Terminate */}
          {session.status !== 'terminated' && (
            <button
              onClick={terminate}
              disabled={sending}
              className="w-full rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              ❌ Terminate Exam
            </button>
          )}
        </div>

        {/* Violation log */}
        <div className="px-5 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Violation Log ({violations.length})
          </h3>
          {violations.length === 0 ? (
            <p className="text-xs text-gray-400">No violations recorded.</p>
          ) : (
            <div className="space-y-2">
              {violations.map((v) => (
                <div key={v._id} className={`rounded-lg border p-3 text-xs ${
                  v.severity === 'high' ? 'border-red-200 bg-red-50' :
                  v.severity === 'medium' ? 'border-amber-200 bg-amber-50' :
                  'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{v.type}</span>
                    <span className={`rounded-full px-1.5 py-0.5 ${
                      v.severity === 'high' ? 'bg-red-200 text-red-700' :
                      v.severity === 'medium' ? 'bg-amber-200 text-amber-700' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {v.severity}
                    </span>
                  </div>
                  {v.description && <p className="mt-1 text-gray-500">{v.description}</p>}
                  <p className="mt-1 text-gray-400">{new Date(v.createdAt).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main LiveMonitor ──────────────────────────────────────────────────────────

export default function LiveMonitor() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const [sessions, setSessions] = useState({}); // candidateId → session
  const [frames, setFrames] = useState({});    // candidateId → base64 frame
  const [violations, setViolations] = useState([]); // global feed

  const [selectedDrawer, setSelectedDrawer] = useState(null);
  const [drawerViolations, setDrawerViolations] = useState([]);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [broadcastText, setBroadcastText] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [muteViolations, setMuteViolations] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Socket setup ─────────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('proctor:join', { examId });
    });

    socket.on('session:list', (list) => {
      const map = {};
      list.forEach((s) => { map[String(s.candidateId)] = s; });
      setSessions(map);
      setLoading(false);
    });

    socket.on('candidate:update', (update) => {
      setSessions((prev) => {
        const id = String(update.candidateId);
        const existing = prev[id] || {};
        const merged = { ...existing, ...update };
        // If update signals violation increment, add 1
        if (update.violationCount === true) {
          merged.violationCount = (existing.violationCount || 0) + 1;
          if (update.severity) {
            const order = { none: 0, low: 1, medium: 2, high: 3 };
            if ((order[update.severity] || 0) > (order[existing.highestSeverity] || 0)) {
              merged.highestSeverity = update.severity;
            }
          }
        }
        return { ...prev, [id]: merged };
      });
    });

    socket.on('frame:update', ({ candidateId, frame }) => {
      setFrames((prev) => ({ ...prev, [String(candidateId)]: frame }));
    });

    socket.on('violation:event', (violation) => {
      setViolations((prev) => [violation, ...prev].slice(0, 200));
      if (!muteViolations && violation.severity === 'high') {
        // Audio ping for high severity (browser Audio API)
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          osc.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        } catch {}
      }
    });

    return () => socket.disconnect();
  }, [examId]);

  // ── Drawer ────────────────────────────────────────────────────────────────

  const openDrawer = useCallback(async (session) => {
    setSelectedDrawer(session);
    try {
      const res = await api.get(`/monitor/${examId}/violations/${session.candidateId}`);
      setDrawerViolations(res.data);
    } catch {
      setDrawerViolations([]);
    }
  }, [examId]);

  const onSessionUpdate = useCallback((candidateId, patch) => {
    setSessions((prev) => ({
      ...prev,
      [candidateId]: { ...(prev[candidateId] || {}), ...patch },
    }));
  }, []);

  // ── Bulk actions ──────────────────────────────────────────────────────────

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const bulkSendMessage = () => {
    const msg = prompt('Message to send to selected candidates:');
    if (!msg) return;
    selectedIds.forEach((id) => {
      socketRef.current?.emit('proctor:send_message', { examId, candidateId: id, message: msg });
    });
    setSelectMode(false);
    setSelectedIds([]);
  };

  const bulkSendWarning = () => {
    if (!confirm(`Send a formal warning to ${selectedIds.length} candidates?`)) return;
    selectedIds.forEach((id) => {
      const s = sessions[id];
      socketRef.current?.emit('proctor:send_warning', {
        examId,
        candidateId: id,
        candidateName: s?.candidateName || id,
      });
    });
    setSelectMode(false);
    setSelectedIds([]);
  };

  const bulkExportViolations = async () => {
    const rows = violations
      .filter((v) => selectedIds.includes(String(v.candidateId)))
      .map((v) =>
        [v.candidateName, v.type, v.severity, v.description || '', new Date(v.createdAt).toISOString()].join(','),
      );
    const csv = 'Candidate,Type,Severity,Description,Timestamp\n' + rows.join('\n');
    const url = URL.createObjectURL(new Blob([csv]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `violations-${examId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSelectMode(false);
    setSelectedIds([]);
  };

  const broadcast = () => {
    if (!broadcastText.trim()) return;
    socketRef.current?.emit('proctor:broadcast', { examId, message: broadcastText });
    setBroadcastText('');
    setShowBroadcast(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const sessionList = Object.values(sessions);
  const filteredViolations = filterSeverity
    ? violations.filter((v) => v.severity === filterSeverity)
    : violations;

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Control ribbon */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-800">
          ← Home
        </button>
        <span className="text-base font-semibold text-gray-900">Live Monitor</span>
        <span className="text-xs text-gray-400">Exam {examId}</span>
        <div className="flex-1" />

        {/* Broadcast */}
        {showBroadcast ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Message to all candidates..."
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && broadcast()}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button onClick={broadcast} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">
              Send to All
            </button>
            <button onClick={() => setShowBroadcast(false)} className="text-gray-400 hover:text-gray-700 text-lg">×</button>
          </div>
        ) : (
          <button
            onClick={() => setShowBroadcast(true)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Broadcast Message
          </button>
        )}

        <button
          onClick={() => { setSelectMode(!selectMode); setSelectedIds([]); }}
          className={`rounded border px-3 py-1.5 text-sm ${selectMode ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          {selectMode ? 'Exit Select' : 'Select'}
        </button>

        <button
          onClick={() => setMuteViolations(!muteViolations)}
          title={muteViolations ? 'Unmute alerts' : 'Mute alerts'}
          className="text-lg"
        >
          {muteViolations ? '🔇' : '🔔'}
        </button>
      </div>

      {/* Bulk action bar */}
      {selectMode && selectedIds.length > 0 && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-5 py-2 flex items-center gap-3">
          <span className="text-sm font-medium text-indigo-800">{selectedIds.length} selected</span>
          <button onClick={bulkSendMessage} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700">
            Send Message
          </button>
          <button onClick={bulkSendWarning} className="rounded bg-amber-500 px-3 py-1 text-sm text-white hover:bg-amber-600">
            Send Warning
          </button>
          <button onClick={bulkExportViolations} className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
            Export Violations
          </button>
          <button
            onClick={() => setSelectedIds(sessionList.map((s) => String(s.candidateId)))}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Select All
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Candidate grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Connecting to exam room...
            </div>
          ) : sessionList.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-sm">No candidates have joined yet.</p>
                <p className="text-xs mt-1 text-gray-300">They will appear here when they start the exam.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {sessionList.map((session) => {
                const id = String(session.candidateId);
                return (
                  <CandidateTile
                    key={id}
                    session={session}
                    frame={frames[id] || null}
                    selected={selectedIds.includes(id)}
                    onSelect={toggleSelect}
                    onClick={openDrawer}
                    selectMode={selectMode}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Violation feed */}
        <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Violation Feed</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="text-xs border border-gray-200 rounded px-1 py-0.5"
            >
              <option value="">All</option>
              <option value="high">High only</option>
              <option value="medium">Medium+</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredViolations.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-300">
                No violations yet
              </div>
            ) : (
              filteredViolations.map((v, i) => (
                <div
                  key={i}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    v.severity === 'high' ? 'bg-red-50' : ''
                  }`}
                  onClick={() => {
                    const s = sessions[String(v.candidateId)];
                    if (s) openDrawer(s);
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-medium text-gray-800 leading-tight">{v.candidateName}</span>
                    <span className={`text-xs rounded px-1 py-0.5 flex-shrink-0 ${
                      v.severity === 'high' ? 'bg-red-200 text-red-700' :
                      v.severity === 'medium' ? 'bg-amber-200 text-amber-700' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {v.severity}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{v.type}</div>
                  <div className="text-xs text-gray-300 mt-0.5">
                    {new Date(v.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Candidate detail drawer */}
      {selectedDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-10"
            onClick={() => setSelectedDrawer(null)}
          />
          <CandidateDrawer
            session={sessions[String(selectedDrawer.candidateId)] || selectedDrawer}
            frame={frames[String(selectedDrawer.candidateId)] || null}
            violations={drawerViolations}
            socket={socketRef.current}
            examId={examId}
            onClose={() => setSelectedDrawer(null)}
            onSessionUpdate={onSessionUpdate}
          />
        </>
      )}
    </div>
  );
}
