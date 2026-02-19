import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

function formatLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatusBadge({ status }) {
  const cls = {
    scheduled: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
  }[status] || 'bg-gray-100 text-gray-600';
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>{status}</span>;
}

export default function ExamScheduler() {
  const { id } = useParams(); // schedule id when editing
  const navigate = useNavigate();

  const [papers, setPapers] = useState([]);
  const [students, setStudents] = useState([]);

  // Form state
  const [paperId, setPaperId] = useState('');
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [lateJoin, setLateJoin] = useState(10);
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [status, setStatus] = useState('scheduled');

  const [studentSearch, setStudentSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/exam-papers').then((r) => setPapers(r.data.filter((p) => p.status === 'published'))).catch(() => {});
    api.get('/admin/users').then((r) => setStudents(r.data.filter((u) => u.role === 'student'))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get(`/exam-schedules/${id}`).then((r) => {
      const s = r.data;
      setPaperId(s.paperId || '');
      setTitle(s.title || '');
      setScheduledAt(formatLocal(s.scheduledAt));
      setDurationMinutes(s.durationMinutes || 60);
      setEnrolledIds(new Set(s.enrolledStudents?.map(String) || []));
      setLateJoin(s.settings?.lateJoinWindowMinutes ?? 10);
      setAutoSubmit(s.settings?.autoSubmit ?? true);
      setStatus(s.status || 'scheduled');
    }).catch(() => {});
  }, [id]);

  const filteredStudents = students.filter((s) =>
    !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  function toggleStudent(sid) {
    setEnrolledIds((prev) => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
  }

  function selectAll() { setEnrolledIds(new Set(students.map((s) => s._id || s.id))); }
  function selectNone() { setEnrolledIds(new Set()); }

  const buildPayload = () => ({
    paperId,
    title,
    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
    durationMinutes: Number(durationMinutes),
    enrolledStudents: [...enrolledIds],
    settings: { lateJoinWindowMinutes: Number(lateJoin), autoSubmit },
  });

  async function save() {
    if (!paperId) { setError('Select an exam paper'); return; }
    if (!title.trim()) { setError('Title is required'); return; }
    if (!scheduledAt) { setError('Select a date and time'); return; }
    if (enrolledIds.size === 0) { setError('Enroll at least one student'); return; }
    setSaving(true); setError('');
    try {
      if (id) { await api.put(`/exam-schedules/${id}`, buildPayload()); }
      else { await api.post('/exam-schedules', buildPayload()); }
      navigate('/exams');
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  }

  async function activate() {
    if (!id) { await save(); return; }
    setActivating(true); setError('');
    try {
      await api.patch(`/exam-schedules/${id}/activate`);
      navigate('/exams');
    } catch (e) {
      setError(e.response?.data?.message || 'Activation failed');
    } finally { setActivating(false); }
  }

  const selectedPaper = papers.find((p) => p._id === paperId);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/exams')} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-semibold text-gray-800">{id ? 'Edit Exam Schedule' : 'Schedule Exam'}</h1>
          {id && <StatusBadge status={status} />}
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button onClick={save} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
          {(!id || status === 'scheduled') && (
            <button onClick={activate} disabled={activating} className="rounded-lg bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 text-sm font-semibold disabled:opacity-60 transition-colors">
              {activating ? 'Activating…' : id ? 'Activate Exam' : 'Save & Activate'}
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 gap-6">

        {/* ── Left col: exam settings ── */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Exam Settings</h2>

            {/* Paper picker */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Exam Paper *</label>
              <select
                value={paperId}
                onChange={(e) => { setPaperId(e.target.value); const p = papers.find((x) => x._id === e.target.value); if (p) setTitle(p.title); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="">Select a published paper…</option>
                {papers.map((p) => (
                  <option key={p._id} value={p._id}>{p.title} ({p.totalMarks} marks)</option>
                ))}
              </select>
              {selectedPaper && (
                <div className="mt-2 rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-700 space-y-1">
                  <p><strong>{selectedPaper.sections?.length || 0} sections</strong> · <strong>{selectedPaper.totalMarks} marks</strong></p>
                  {selectedPaper.sections?.map((s, i) => (
                    <p key={i} className="text-indigo-500">Section {i+1}: {s.name} — {s.questions?.length || 0} questions</p>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Exam Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mid-Term Assessment — Batch 2024"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date &amp; Time *</label>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Duration (minutes) *</label>
                <input type="number" min={10} max={480} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Late join window (minutes)</label>
                <input type="number" min={0} max={60} value={lateJoin} onChange={(e) => setLateJoin(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={autoSubmit} onChange={(e) => setAutoSubmit(e.target.checked)} />
                  Auto-submit on timeout
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right col: student enrollment ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Enroll Students</h2>
            <span className="text-xs text-gray-400">{enrolledIds.size} / {students.length} selected</span>
          </div>

          <input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />

          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline">Select all</button>
            <span className="text-gray-300">·</span>
            <button onClick={selectNone} className="text-xs text-gray-500 hover:underline">Clear</button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-80 rounded-lg border border-gray-100">
            {filteredStudents.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">
                {students.length === 0 ? 'No student accounts found.\nCreate student accounts in User Management first.' : 'No students match your search.'}
              </p>
            )}
            {filteredStudents.map((s) => {
              const sid = s._id || s.id;
              const checked = enrolledIds.has(sid);
              return (
                <label key={sid} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${checked ? 'bg-indigo-50' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleStudent(sid)} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
