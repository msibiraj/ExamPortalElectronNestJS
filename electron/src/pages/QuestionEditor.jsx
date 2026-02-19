import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++', 'Go'];
const DEFAULT_TIME_LIMITS = { Python: 5, JavaScript: 5, Java: 10, 'C++': 5, Go: 5 };

function SectionTitle({ children }) {
  return <h3 className="mt-6 mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-1">{children}</h3>;
}

function Field({ label, required, children, hint }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ── MCQ Section ───────────────────────────────────────────────────────────────

function McqOptions({ form, setForm }) {
  const isMultiple = form.type === 'mcq-multiple';

  const addOption = () =>
    setForm((f) => ({ ...f, options: [...(f.options || []), { text: '', isCorrect: false }] }));

  const removeOption = (i) =>
    setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));

  const updateOption = (i, key, value) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, idx) => {
        if (idx !== i) {
          if (!isMultiple && key === 'isCorrect' && value) return { ...o, isCorrect: false };
          return o;
        }
        return { ...o, [key]: value };
      }),
    }));

  return (
    <>
      <SectionTitle>Answer Options</SectionTitle>
      {(form.options || []).map((opt, i) => (
        <div key={i} className="flex items-center gap-3 mb-2">
          <span className="text-gray-400 text-sm w-4">{i + 1}.</span>
          <input
            type="text"
            placeholder={`Option ${i + 1}`}
            value={opt.text}
            onChange={(e) => updateOption(i, 'text', e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <label className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap">
            <input
              type={isMultiple ? 'checkbox' : 'radio'}
              name="correct"
              checked={opt.isCorrect}
              onChange={(e) => updateOption(i, 'isCorrect', e.target.checked)}
              className="accent-indigo-600"
            />
            Correct
          </label>
          <button
            type="button"
            onClick={() => removeOption(i)}
            className="text-gray-300 hover:text-red-500 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addOption}
        className="mt-1 text-sm text-indigo-600 hover:text-indigo-800"
      >
        + Add Option
      </button>
      <div className="mt-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={form.shuffleOptions || false}
            onChange={(e) => setForm((f) => ({ ...f, shuffleOptions: e.target.checked }))}
            className="accent-indigo-600"
          />
          Shuffle Options (randomise order per candidate)
        </label>
      </div>
    </>
  );
}

// ── Descriptive Section ───────────────────────────────────────────────────────

function DescriptiveFields({ form, setForm }) {
  return (
    <>
      <SectionTitle>Descriptive Settings</SectionTitle>
      <Field label="Marking Rubric" hint="Private — candidates cannot see this.">
        <textarea
          rows={4}
          placeholder="Key points the evaluator should look for..."
          value={form.markingRubric || ''}
          onChange={(e) => setForm((f) => ({ ...f, markingRubric: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Min Words" hint="Leave blank for no minimum.">
          <input
            type="number"
            min={0}
            value={form.minWords ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, minWords: e.target.value ? +e.target.value : undefined }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Field>
        <Field label="Max Words" hint="Leave blank for no maximum.">
          <input
            type="number"
            min={0}
            value={form.maxWords ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, maxWords: e.target.value ? +e.target.value : undefined }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Field>
      </div>
    </>
  );
}

// ── Programming Section ───────────────────────────────────────────────────────

function ProgrammingFields({ form, setForm }) {
  const toggleLang = (lang) => {
    const current = form.allowedLanguages || [];
    const next = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang];
    setForm((f) => ({ ...f, allowedLanguages: next }));
  };

  const setTimeLimit = (lang, val) => {
    setForm((f) => ({ ...f, timeLimits: { ...(f.timeLimits || {}), [lang]: +val } }));
  };

  const setStarterCode = (lang, val) => {
    setForm((f) => ({ ...f, starterCode: { ...(f.starterCode || {}), [lang]: val } }));
  };

  const addTestCase = () =>
    setForm((f) => ({
      ...f,
      testCases: [
        ...(f.testCases || []),
        { input: '', expectedOutput: '', weight: 0, isHidden: false },
      ],
    }));

  const removeTestCase = (i) =>
    setForm((f) => ({ ...f, testCases: f.testCases.filter((_, idx) => idx !== i) }));

  const updateTestCase = (i, key, val) =>
    setForm((f) => ({
      ...f,
      testCases: f.testCases.map((tc, idx) => (idx === i ? { ...tc, [key]: val } : tc)),
    }));

  const totalWeight = (form.testCases || []).reduce((s, tc) => s + (+tc.weight || 0), 0);

  return (
    <>
      <SectionTitle>Language Settings</SectionTitle>
      <Field label="Allowed Languages" required>
        <div className="flex flex-wrap gap-3">
          {LANGUAGES.map((lang) => (
            <label key={lang} className="flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={(form.allowedLanguages || []).includes(lang)}
                onChange={() => toggleLang(lang)}
                className="accent-indigo-600"
              />
              {lang}
            </label>
          ))}
        </div>
      </Field>

      {(form.allowedLanguages || []).length > 0 && (
        <Field label="Time Limits (seconds)">
          <div className="flex flex-wrap gap-3">
            {(form.allowedLanguages || []).map((lang) => (
              <div key={lang} className="flex items-center gap-1 text-sm">
                <span className="text-gray-600 w-24">{lang}</span>
                <input
                  type="number"
                  min={1}
                  value={form.timeLimits?.[lang] ?? DEFAULT_TIME_LIMITS[lang] ?? 5}
                  onChange={(e) => setTimeLimit(lang, e.target.value)}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="text-gray-400">s</span>
              </div>
            ))}
          </div>
        </Field>
      )}

      <Field label="Memory Limit (MB)">
        <input
          type="number"
          min={32}
          value={form.memoryLimit ?? 256}
          onChange={(e) => setForm((f) => ({ ...f, memoryLimit: +e.target.value }))}
          className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </Field>

      <SectionTitle>Starter Code</SectionTitle>
      {(form.allowedLanguages || []).map((lang) => (
        <Field key={lang} label={lang}>
          <textarea
            rows={4}
            placeholder={`Boilerplate code for ${lang}...`}
            value={form.starterCode?.[lang] || ''}
            onChange={(e) => setStarterCode(lang, e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Field>
      ))}

      <SectionTitle>Test Cases</SectionTitle>
      {(form.testCases || []).map((tc, i) => (
        <div key={i} className="mb-4 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Test Case {i + 1}</span>
            <button
              type="button"
              onClick={() => removeTestCase(i)}
              className="text-sm text-red-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Input (stdin)</label>
              <textarea
                rows={3}
                value={tc.input}
                onChange={(e) => updateTestCase(i, 'input', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expected Output (stdout)</label>
              <textarea
                rows={3}
                value={tc.expectedOutput}
                onChange={(e) => updateTestCase(i, 'expectedOutput', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <label className="text-gray-600">Weight (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={tc.weight}
                onChange={(e) => updateTestCase(i, 'weight', +e.target.value)}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={tc.isHidden}
                onChange={(e) => updateTestCase(i, 'isHidden', e.target.checked)}
                className="accent-indigo-600"
              />
              Hidden (not shown to candidates)
            </label>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={addTestCase}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          + Add Test Case
        </button>
        {(form.testCases || []).length > 0 && (
          <span className={`text-xs ${Math.abs(totalWeight - 100) < 0.01 ? 'text-green-600' : 'text-amber-600'}`}>
            Total weight: {totalWeight}% {Math.abs(totalWeight - 100) < 0.01 ? '✔' : '(must equal 100)'}
          </span>
        )}
      </div>

      <SectionTitle>Reference Solution</SectionTitle>
      <Field label="Language">
        <select
          value={form.referenceLanguage || ''}
          onChange={(e) => setForm((f) => ({ ...f, referenceLanguage: e.target.value }))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-40"
        >
          <option value="">Select...</option>
          {(form.allowedLanguages || []).map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </Field>
      <Field label="Reference Solution" hint="Must pass all test cases before you can publish.">
        <textarea
          rows={8}
          placeholder="Paste a correct, working solution..."
          value={form.referenceSolution || ''}
          onChange={(e) => setForm((f) => ({ ...f, referenceSolution: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </Field>
    </>
  );
}

// ── Main QuestionEditor ───────────────────────────────────────────────────────

export default function QuestionEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    type: 'mcq-single',
    topic: '',
    difficulty: 'easy',
    marks: 1,
    body: '',
    tags: '',
    explanation: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
    shuffleOptions: false,
    markingRubric: '',
    minWords: undefined,
    maxWords: undefined,
    allowedLanguages: ['Python'],
    timeLimits: { Python: 5 },
    memoryLimit: 256,
    starterCode: {},
    testCases: [],
    referenceLanguage: '',
    referenceSolution: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/questions/${id}`).then((res) => {
      const q = res.data;
      setForm({
        ...q,
        tags: (q.tags || []).join(', '),
        timeLimits: q.timeLimits
          ? Object.fromEntries(Object.entries(q.timeLimits))
          : {},
        starterCode: q.starterCode
          ? Object.fromEntries(Object.entries(q.starterCode))
          : {},
      });
    });
  }, [id, isEdit]);

  const buildPayload = () => ({
    ...form,
    tags: form.tags
      ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [],
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/questions/${id}`, buildPayload());
        await api.post(`/questions/${id}/draft`);
      } else {
        await api.post('/questions', buildPayload());
      }
      navigate('/questions');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setError('');
    try {
      let questionId = id;
      if (isEdit) {
        await api.put(`/questions/${id}`, buildPayload());
      } else {
        const res = await api.post('/questions', buildPayload());
        questionId = res.data._id;
      }
      await api.post(`/questions/${questionId}/publish`);
      navigate('/questions');
    } catch (err) {
      setError(err.response?.data?.message || 'Publish failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/questions')}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ← Question Bank
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Question' : 'New Question'}
          </h1>
        </div>
        <div className="flex gap-2">
          {isEdit && (
            <button
              onClick={() => navigate(`/questions/${id}/history`)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              🕐 History
            </button>
          )}
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={handlePublish}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            ❌ {error}
          </div>
        )}

        {/* Metadata */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <SectionTitle>Question Metadata</SectionTitle>

          <Field label="Question Type" required>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="mcq-single">MCQ Single Answer</option>
              <option value="mcq-multiple">MCQ Multiple Answer</option>
              <option value="descriptive">Descriptive</option>
              <option value="programming">Programming</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Topic" required>
              <input
                type="text"
                placeholder="e.g. Data Structures > Arrays"
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>
            <Field label="Difficulty" required>
              <select
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Field>
          </div>

          <Field label="Marks" required>
            <input
              type="number"
              min={0}
              step={0.5}
              value={form.marks}
              onChange={(e) => setForm((f) => ({ ...f, marks: +e.target.value }))}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>

          <Field label="Tags" hint="Comma-separated. e.g. graph, bfs, shortest-path">
            <input
              type="text"
              placeholder="graph, bfs, shortest-path"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>

          <SectionTitle>Question Body</SectionTitle>
          <Field label="Question Text" required>
            <textarea
              rows={6}
              placeholder="Write your question here..."
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>

          {/* Type-specific fields */}
          {(form.type === 'mcq-single' || form.type === 'mcq-multiple') && (
            <McqOptions form={form} setForm={setForm} />
          )}
          {form.type === 'descriptive' && (
            <DescriptiveFields form={form} setForm={setForm} />
          )}
          {form.type === 'programming' && (
            <ProgrammingFields form={form} setForm={setForm} />
          )}

          <SectionTitle>Explanation (Optional)</SectionTitle>
          <Field label="Answer Explanation" hint="Shown to candidates after the exam ends.">
            <textarea
              rows={3}
              placeholder="Explain the correct answer..."
              value={form.explanation}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
        </div>

        {/* Bottom action bar */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => navigate('/questions')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={handlePublish}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
