import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Mock active/recent exams — replace with real API call when exam scheduling service is ready
const MOCK_EXAMS = [
  {
    id: 'exam-demo-001',
    title: 'Programming Assessment — Mock Exam',
    status: 'active',
    startedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    durationMinutes: 90,
    candidateCount: 12,
    activeCount: 10,
    violationCount: 3,
  },
  {
    id: 'exam-demo-002',
    title: 'Data Structures Midterm',
    status: 'active',
    startedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    durationMinutes: 120,
    candidateCount: 28,
    activeCount: 27,
    violationCount: 1,
  },
  {
    id: 'exam-demo-003',
    title: 'Algorithm Fundamentals Quiz',
    status: 'closed',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    durationMinutes: 45,
    candidateCount: 15,
    activeCount: 0,
    violationCount: 7,
  },
];

function statusStyle(status) {
  return status === 'active'
    ? { dot: 'bg-green-500', badge: 'bg-green-100 text-green-700', label: 'Live' }
    : { dot: 'bg-gray-400',  badge: 'bg-gray-100 text-gray-600',   label: 'Closed' };
}

function elapsed(isoStart) {
  const ms = Date.now() - new Date(isoStart).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m elapsed` : `${m}m elapsed`;
}

export default function MonitorList() {
  const navigate = useNavigate();
  const [customId, setCustomId] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Dashboard
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-base font-semibold text-gray-900">Live Monitor</h1>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Active Exams</h2>
          <div className="space-y-3">
            {MOCK_EXAMS.filter((e) => e.status === 'active').map((exam) => {
              const s = statusStyle(exam.status);
              return (
                <div
                  key={exam.id}
                  className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 p-4 shadow-sm"
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot} animate-pulse`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-800 text-sm">{exam.title}</span>
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${s.badge}`}>{s.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{elapsed(exam.startedAt)}</span>
                      <span>{exam.durationMinutes} min exam</span>
                      <span className="text-green-600 font-medium">{exam.activeCount}/{exam.candidateCount} active</span>
                      {exam.violationCount > 0 && (
                        <span className="text-red-500 font-medium">{exam.violationCount} violation{exam.violationCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/monitor/${exam.id}`)}
                    className="shrink-0 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 transition-colors"
                  >
                    Enter Monitor
                  </button>
                </div>
              );
            })}

            {MOCK_EXAMS.filter((e) => e.status === 'active').length === 0 && (
              <p className="text-sm text-gray-400">No active exams right now.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent / Closed</h2>
          <div className="space-y-2">
            {MOCK_EXAMS.filter((e) => e.status === 'closed').map((exam) => {
              const s = statusStyle(exam.status);
              return (
                <div
                  key={exam.id}
                  className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 px-4 py-3 opacity-70"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 font-medium">{exam.title}</span>
                    <span className="ml-2 text-xs text-gray-400">{exam.violationCount} violations recorded</span>
                  </div>
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${s.badge}`}>{s.label}</span>
                  <button
                    onClick={() => navigate(`/monitor/${exam.id}`)}
                    className="shrink-0 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 transition-colors"
                  >
                    Review
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manual exam ID entry */}
        <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-2">Enter Exam ID Manually</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 6840abc123def456"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={() => customId.trim() && navigate(`/monitor/${customId.trim()}`)}
              disabled={!customId.trim()}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              Open
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
