import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const TYPE_LABEL = {
  'mcq-single': 'MCQ', 'mcq-multiple': 'Multi-MCQ',
  'descriptive': 'Descriptive', 'programming': 'Programming',
};
const DIFF_COLOR = {
  easy: 'text-green-600 bg-green-50', medium: 'text-yellow-600 bg-yellow-50', hard: 'text-red-600 bg-red-50',
};

// ── Small helpers ─────────────────────────────────────────────────────────────
function Badge({ children, color = 'gray' }) {
  const cls = { gray:'bg-gray-100 text-gray-600', indigo:'bg-indigo-50 text-indigo-700', violet:'bg-violet-50 text-violet-700' }[color] || 'bg-gray-100 text-gray-600';
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

function SectionCard({ section, idx, onUpdate, onRemove, onAddQuestion, onRemoveQuestion, onMoveQuestion }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 bg-gray-50 border-b border-gray-200 px-4 py-3">
        <span className="text-xs font-bold text-gray-400 uppercase">Section {idx + 1}</span>
        <input
          value={section.name}
          onChange={(e) => onUpdate(idx, { name: e.target.value })}
          placeholder="Section name (e.g. Part A — MCQ)"
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <span className="text-xs text-gray-400 shrink-0">
          {section.questions.length} Q · {section.questions.reduce((s, q) => s + q.marks, 0)} marks
        </span>
        <button onClick={() => onRemove(idx)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
      </div>

      {/* Section instructions */}
      <div className="px-4 py-2 border-b border-gray-100">
        <input
          value={section.instructions || ''}
          onChange={(e) => onUpdate(idx, { instructions: e.target.value })}
          placeholder="Instructions for this section (optional)"
          className="w-full text-xs text-gray-500 border-0 focus:outline-none bg-transparent placeholder-gray-300"
        />
      </div>

      {/* Questions list */}
      <div className="divide-y divide-gray-100">
        {section.questions.length === 0 && (
          <p className="px-4 py-4 text-xs text-gray-400 italic text-center">
            No questions yet — click &quot;+ Add&quot; on a question in the bank →
          </p>
        )}
        {section.questions.map((q, qi) => (
          <div key={q.questionId} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-xs text-gray-400 w-5 text-right shrink-0">{qi + 1}.</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 truncate">{q.body}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge>{TYPE_LABEL[q.type] || q.type}</Badge>
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${DIFF_COLOR[q.difficulty] || ''}`}>{q.difficulty}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                min={1}
                value={q.marks}
                onChange={(e) => onMoveQuestion(idx, qi, { marks: parseInt(e.target.value) || 1 })}
                className="w-14 rounded border border-gray-300 text-xs text-center py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <span className="text-xs text-gray-400">pts</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button disabled={qi === 0} onClick={() => onMoveQuestion(idx, qi, null, -1)} className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↑</button>
              <button disabled={qi === section.questions.length - 1} onClick={() => onMoveQuestion(idx, qi, null, 1)} className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↓</button>
              <button onClick={() => onRemoveQuestion(idx, qi)} className="rounded p-1 text-gray-400 hover:text-red-500">×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ExamBuilder() {
  const { id } = useParams(); // present when editing
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [sections, setSections] = useState([{ name: 'Section A', instructions: '', questions: [] }]);
  const [settings, setSettings] = useState({ shuffleSections: false, shuffleQuestions: false, shuffleOptions: false, showMarks: true });

  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankFilter, setBankFilter] = useState({ search: '', type: '', difficulty: '' });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  // Load bank questions
  useEffect(() => {
    api.get('/questions?status=published').then((res) => setBankQuestions(res.data)).catch(() => {});
  }, []);

  // Load paper if editing
  useEffect(() => {
    if (!id) return;
    api.get(`/exam-papers/${id}`).then((res) => {
      const p = res.data;
      setTitle(p.title || '');
      setDescription(p.description || '');
      setInstructions(p.instructions || '');
      setSections(p.sections || []);
      setSettings(p.settings || settings);
    }).catch(() => {});
  }, [id]);

  const filteredBank = bankQuestions.filter((q) => {
    if (bankFilter.search && !q.body?.toLowerCase().includes(bankFilter.search.toLowerCase())) return false;
    if (bankFilter.type && q.type !== bankFilter.type) return false;
    if (bankFilter.difficulty && q.difficulty !== bankFilter.difficulty) return false;
    return true;
  });

  // Check if question is already in the paper
  const usedIds = new Set(sections.flatMap((s) => s.questions.map((q) => q.questionId)));

  function addQuestion(sectionIdx, q) {
    if (usedIds.has(q._id)) return;
    setSections((prev) => {
      const next = prev.map((s, i) => {
        if (i !== sectionIdx) return s;
        return {
          ...s,
          questions: [...s.questions, {
            questionId: q._id,
            order: s.questions.length,
            marks: q.marks || 1,
            body: q.body,
            type: q.type,
            difficulty: q.difficulty,
          }],
        };
      });
      return next;
    });
  }

  function updateSection(idx, patch) {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }

  function removeSection(idx) {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeQuestion(sectionIdx, qIdx) {
    setSections((prev) => prev.map((s, i) => {
      if (i !== sectionIdx) return s;
      return { ...s, questions: s.questions.filter((_, qi) => qi !== qIdx) };
    }));
  }

  function moveOrUpdateQuestion(sectionIdx, qIdx, patch, dir) {
    setSections((prev) => prev.map((s, i) => {
      if (i !== sectionIdx) return s;
      const qs = [...s.questions];
      if (patch) { qs[qIdx] = { ...qs[qIdx], ...patch }; }
      if (dir) {
        const target = qIdx + dir;
        if (target < 0 || target >= qs.length) return s;
        [qs[qIdx], qs[target]] = [qs[target], qs[qIdx]];
      }
      return { ...s, questions: qs };
    }));
  }

  const totalMarks = sections.reduce((s, sec) => s + sec.questions.reduce((a, q) => a + q.marks, 0), 0);
  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0);

  const buildPayload = useCallback(() => ({
    title,
    description,
    instructions,
    sections: sections.map((s) => ({
      name: s.name,
      instructions: s.instructions,
      questions: s.questions.map((q, i) => ({ questionId: q.questionId, order: i, marks: q.marks })),
    })),
    settings,
  }), [title, description, instructions, sections, settings]);

  async function save() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      if (id) { await api.put(`/exam-papers/${id}`, buildPayload()); navigate('/exams'); }
      else { const r = await api.post('/exam-papers', buildPayload()); navigate(`/exam-papers/${r.data._id}/edit`); }
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  }

  async function publish() {
    if (!title.trim()) { setError('Title is required'); return; }
    if (totalQuestions === 0) { setError('Add at least one question before publishing'); return; }
    setPublishing(true); setError('');
    try {
      let paperId = id;
      if (!paperId) {
        const r = await api.post('/exam-papers', buildPayload());
        paperId = r.data._id;
      } else {
        // Only update if still a draft; published papers cannot be edited
        try { await api.put(`/exam-papers/${id}`, buildPayload()); } catch (_) {}
      }
      await api.post(`/exam-papers/${paperId}/publish`);
      navigate('/exams');
    } catch (e) {
      setError(e.response?.data?.message || 'Publish failed');
    } finally { setPublishing(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/exams')} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-semibold text-gray-800">{id ? 'Edit Exam Paper' : 'New Exam Paper'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{totalQuestions} Q · {totalMarks} marks</span>
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button onClick={save} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={publish} disabled={publishing} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 text-sm font-semibold disabled:opacity-60 transition-colors">
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-53px)] overflow-hidden">

        {/* ── LEFT: Paper builder ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Paper metadata */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Exam Paper Title *"
              className="w-full text-xl font-bold text-gray-900 border-0 border-b border-gray-200 pb-2 focus:outline-none focus:border-indigo-400"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
            />
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="General instructions shown to students (optional)"
              rows={3}
              className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
            />
            {/* Settings row */}
            <div className="flex flex-wrap gap-4 pt-1">
              {[
                ['shuffleQuestions', 'Shuffle questions'],
                ['shuffleOptions', 'Shuffle MCQ options'],
                ['showMarks', 'Show marks per question'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={settings[key]} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Sections */}
          {sections.map((sec, idx) => (
            <SectionCard
              key={idx}
              section={sec}
              idx={idx}
              onUpdate={updateSection}
              onRemove={removeSection}
              onRemoveQuestion={removeQuestion}
              onMoveQuestion={moveOrUpdateQuestion}
            />
          ))}

          <button
            onClick={() => setSections((p) => [...p, { name: `Section ${String.fromCharCode(65 + p.length)}`, instructions: '', questions: [] }])}
            className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            + Add Section
          </button>
        </div>

        {/* ── RIGHT: Question Bank ── */}
        <div className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Question Bank</p>
            <input
              value={bankFilter.search}
              onChange={(e) => setBankFilter((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search questions…"
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 mb-2"
            />
            <div className="flex gap-2">
              <select value={bankFilter.type} onChange={(e) => setBankFilter((f) => ({ ...f, type: e.target.value }))} className="flex-1 rounded border border-gray-300 text-xs px-1.5 py-1 focus:outline-none">
                <option value="">All types</option>
                <option value="mcq-single">MCQ</option>
                <option value="mcq-multiple">Multi-MCQ</option>
                <option value="descriptive">Descriptive</option>
                <option value="programming">Programming</option>
              </select>
              <select value={bankFilter.difficulty} onChange={(e) => setBankFilter((f) => ({ ...f, difficulty: e.target.value }))} className="flex-1 rounded border border-gray-300 text-xs px-1.5 py-1 focus:outline-none">
                <option value="">All levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredBank.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">
                {bankQuestions.length === 0 ? 'No published questions yet.\nPublish questions from Question Bank first.' : 'No questions match the filter.'}
              </p>
            )}
            {filteredBank.map((q) => {
              const used = usedIds.has(q._id);
              return (
                <div key={q._id} className={`p-3 ${used ? 'opacity-40' : ''}`}>
                  <p className="text-xs text-gray-800 line-clamp-2 mb-1.5">{q.body}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Badge>{TYPE_LABEL[q.type] || q.type}</Badge>
                      <span className={`rounded px-1 py-0.5 text-xs font-medium ${DIFF_COLOR[q.difficulty] || ''}`}>{q.difficulty}</span>
                      <span className="text-xs text-gray-400">{q.marks}pts</span>
                    </div>
                    {!used && (
                      <select
                        defaultValue=""
                        onChange={(e) => { if (e.target.value !== '') { addQuestion(parseInt(e.target.value), q); e.target.value = ''; } }}
                        className="text-xs rounded border border-indigo-300 text-indigo-600 px-1 py-0.5 focus:outline-none"
                      >
                        <option value="">+ Add to…</option>
                        {sections.map((s, i) => (
                          <option key={i} value={i}>Section {i + 1}: {s.name || `Section ${i + 1}`}</option>
                        ))}
                      </select>
                    )}
                    {used && <span className="text-xs text-green-600">✓ Added</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
