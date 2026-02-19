import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

function StatusBadge({ status }) {
  const cls =
    status === 'active'    ? 'bg-green-100 text-green-700' :
    status === 'upcoming'  ? 'bg-blue-100 text-blue-700'   :
    status === 'completed' ? 'bg-gray-100 text-gray-600'   :
                             'bg-yellow-100 text-yellow-700';
  const label =
    status === 'active'    ? 'Live Now' :
    status === 'upcoming'  ? 'Upcoming' :
    status === 'completed' ? 'Completed' : status;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Countdown({ scheduledAt }) {
  const [diff, setDiff] = useState(new Date(scheduledAt) - Date.now());

  useEffect(() => {
    const id = setInterval(() => setDiff(new Date(scheduledAt) - Date.now()), 1000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  if (diff <= 0) return <span className="text-green-600 font-semibold text-xs">Starting now</span>;

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  if (h > 23) {
    const days = Math.floor(h / 24);
    return <span className="text-gray-500 text-xs">Starts in {days}d {h % 24}h</span>;
  }
  return (
    <span className={`text-xs font-mono font-semibold ${h === 0 && m < 30 ? 'text-orange-500' : 'text-gray-500'}`}>
      Starts in {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  );
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/exams')
      .then((r) => setExams(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Map API status: 'scheduled' → display as upcoming, 'active'/isLive → active
  const normalize = (e) => ({
    ...e,
    id: e._id,
    displayStatus: e.isLive || e.status === 'active' ? 'active' : e.status === 'scheduled' ? 'upcoming' : e.status,
  });

  const normalized  = exams.map(normalize);
  const activeExams   = normalized.filter((e) => e.displayStatus === 'active');
  const upcomingExams = normalized.filter((e) => e.displayStatus === 'upcoming');
  const pastExams     = normalized.filter((e) => e.displayStatus === 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">ProctorPlatform</h1>
            <p className="text-xs text-gray-400">Student Portal</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">

        {loading && (
          <div className="flex justify-center py-20 text-gray-400 text-sm">Loading your exams…</div>
        )}

        {/* Active exam — prominent CTA */}
        {!loading && activeExams.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Active Exam
            </h2>
            {activeExams.map((exam) => (
              <div
                key={exam.id}
                className="rounded-xl border-2 border-green-400 bg-green-50 p-5 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-gray-900">{exam.title}</span>
                    <StatusBadge status="active" />
                  </div>
                  <p className="text-sm text-gray-600">{exam.durationMinutes} min</p>
                </div>
                <button
                  onClick={() => navigate(`/exam/${exam.id}`)}
                  className="shrink-0 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-sm px-5 py-2.5 transition-colors shadow"
                >
                  Enter Exam
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Upcoming exams */}
        {!loading && upcomingExams.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Upcoming Exams
            </h2>
            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-4 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-800 text-sm">{exam.title}</span>
                      <StatusBadge status="upcoming" />
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatTime(exam.scheduledAt)} &bull; {exam.durationMinutes} min
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Countdown scheduledAt={exam.scheduledAt} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past exams */}
        {!loading && pastExams.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Past Exams
            </h2>
            <div className="space-y-2">
              {pastExams.map((exam) => (
                <div
                  key={exam.id}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-4 opacity-70"
                >
                  <div className="flex-1">
                    <span className="text-sm text-gray-700 font-medium">{exam.title}</span>
                    <span className="ml-2 text-xs text-gray-400">{formatTime(exam.scheduledAt)}</span>
                  </div>
                  <StatusBadge status="completed" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && exams.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-sm">No exams assigned to you yet.</p>
          </div>
        )}

        {/* Info footer */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700 leading-relaxed">
          <strong>Before your exam:</strong> Make sure your camera is connected and working.
          You will be monitored live by a proctor during the exam.
          Close all other applications and ensure a stable internet connection.
        </div>
      </main>
    </div>
  );
}
