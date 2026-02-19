import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function StatusBadge({ status }) {
  const cls = {
    scheduled: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
    draft: 'bg-yellow-100 text-yellow-700',
    published: 'bg-indigo-100 text-indigo-700',
  }[status] || 'bg-gray-100 text-gray-600';
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>{status}</span>;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ExamsList() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('schedules'); // 'schedules' | 'papers'
  const [schedules, setSchedules] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/exam-schedules').then((r) => setSchedules(r.data)).catch(() => {}),
      api.get('/exam-papers').then((r) => setPapers(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function activate(id) {
    await api.patch(`/exam-schedules/${id}/activate`);
    setSchedules((p) => p.map((s) => s._id === id ? { ...s, status: 'active' } : s));
  }

  async function cancel(id) {
    if (!window.confirm('Cancel this exam?')) return;
    await api.patch(`/exam-schedules/${id}/cancel`);
    setSchedules((p) => p.map((s) => s._id === id ? { ...s, status: 'cancelled' } : s));
  }

  async function end(id) {
    if (!window.confirm('End this exam?')) return;
    await api.patch(`/exam-schedules/${id}/complete`);
    setSchedules((p) => p.map((s) => s._id === id ? { ...s, status: 'completed' } : s));
  }

  async function deletePaper(id) {
    if (!window.confirm('Delete this exam paper?')) return;
    await api.delete(`/exam-papers/${id}`);
    setPapers((p) => p.filter((x) => x._id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:text-gray-800">← Dashboard</button>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-semibold text-gray-900">Exams</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/exam-papers/new')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
            + New Paper
          </button>
          <button onClick={() => navigate('/exam-schedules/new')} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-semibold transition-colors">
            + Schedule Exam
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {[['schedules', 'Scheduled Exams'], ['papers', 'Exam Papers']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}

        {/* Scheduled Exams */}
        {!loading && tab === 'schedules' && (
          <div className="space-y-3">
            {schedules.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">📅</p>
                <p className="text-sm">No exams scheduled yet.</p>
                <button onClick={() => navigate('/exam-schedules/new')} className="mt-4 text-sm text-indigo-600 hover:underline">Schedule your first exam →</button>
              </div>
            )}
            {schedules.map((s) => (
              <div key={s._id} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-4 shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">{s.title}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDate(s.scheduledAt)} · {s.durationMinutes} min · {s.enrolledStudents?.length || 0} students
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.status === 'scheduled' && (
                    <>
                      <button onClick={() => activate(s._id)} className="rounded-lg bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 text-xs font-semibold transition-colors">Activate</button>
                      <button onClick={() => navigate(`/exam-schedules/${s._id}/edit`)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors">Edit</button>
                      <button onClick={() => cancel(s._id)} className="text-xs text-red-500 hover:underline">Cancel</button>
                    </>
                  )}
                  {s.status === 'active' && (
                    <>
                      <button onClick={() => navigate(`/monitor/${s._id}`)} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold transition-colors">Monitor</button>
                      <button onClick={() => end(s._id)} className="text-xs text-red-500 hover:underline">End</button>
                    </>
                  )}
                  {s.status === 'completed' && (
                    <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors" onClick={() => navigate(`/exam-schedules/${s._id}/results`)}>Results</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Exam Papers */}
        {!loading && tab === 'papers' && (
          <div className="space-y-3">
            {papers.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">📄</p>
                <p className="text-sm">No exam papers yet.</p>
                <button onClick={() => navigate('/exam-papers/new')} className="mt-4 text-sm text-indigo-600 hover:underline">Create your first paper →</button>
              </div>
            )}
            {papers.map((p) => (
              <div key={p._id} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-4 shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">{p.title}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {p.sections?.length || 0} sections · {p.totalMarks} marks · {p.sections?.reduce((a, s) => a + (s.questions?.length || 0), 0) || 0} questions
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => navigate(`/exam-papers/${p._id}/edit`)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors">Edit</button>
                  {p.status === 'draft' && (
                    <button onClick={() => navigate(`/exam-schedules/new`)} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold transition-colors">Schedule</button>
                  )}
                  <button onClick={() => deletePaper(p._id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
