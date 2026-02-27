import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../api/axios';

const TYPE_LABELS = {
  'mcq-single':   'MCQ Single',
  'mcq-multiple': 'MCQ Multiple',
  descriptive:    'Descriptive',
  programming:    'Programming',
};

const TYPE_COLORS = {
  'mcq-single':   'bg-blue-100 text-blue-700',
  'mcq-multiple': 'bg-indigo-100 text-indigo-700',
  descriptive:    'bg-amber-100 text-amber-700',
  programming:    'bg-green-100 text-green-700',
};

function StatusBadge({ status }) {
  const cls =
    status === 'submitted'  ? 'bg-green-100 text-green-700' :
    status === 'timed-out'  ? 'bg-amber-100 text-amber-700' :
    'bg-gray-100 text-gray-500';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status === 'timed-out' ? 'Timed Out' : status}
    </span>
  );
}

/** Renders MCQ answer card — read-only, score already set */
function McqAnswerCard({ answer, qIndex }) {
  const q = answer.question;
  const selectedSet = new Set(answer.selectedOptions ?? []);
  const correctSet  = new Set((q?.options ?? []).filter((o) => o.isCorrect).map((o) => o.text));

  return (
    <div className="space-y-2">
      {(q?.options ?? []).map((opt) => {
        const isSelected = selectedSet.has(opt.text);
        const isCorrect  = correctSet.has(opt.text);
        const ring =
          isSelected && isCorrect  ? 'border-green-500 bg-green-50' :
          isSelected && !isCorrect ? 'border-red-400 bg-red-50'     :
          isCorrect                ? 'border-green-300 bg-green-50/40' :
          'border-gray-200 bg-white';
        return (
          <div key={opt.text} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${ring}`}>
            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
              ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </span>
            <span className={isCorrect ? 'font-medium' : ''}>{opt.text}</span>
            {isCorrect && <span className="ml-auto text-xs text-green-600 font-medium">correct</span>}
          </div>
        );
      })}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-gray-500">Auto-graded:</span>
        <span className={`text-sm font-semibold ${
          (answer.score ?? 0) === answer.maxScore ? 'text-green-600' : 'text-red-500'
        }`}>
          {answer.score ?? 0} / {answer.maxScore}
        </span>
      </div>
    </div>
  );
}

/** Renders descriptive answer card with score input */
function DescriptiveAnswerCard({ answer, score, onScoreChange }) {
  const q = answer.question;
  return (
    <div className="space-y-3">
      {/* Student HTML answer */}
      {answer.html ? (
        <div
          className="prose prose-sm max-w-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800"
          dangerouslySetInnerHTML={{ __html: answer.html }}
        />
      ) : (
        <p className="text-sm text-gray-400 italic">No answer submitted.</p>
      )}

      {/* Marking rubric */}
      {q?.markingRubric && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold text-amber-700 mb-1">Marking Rubric</p>
          <p className="text-xs text-amber-800 whitespace-pre-wrap">{q.markingRubric}</p>
        </div>
      )}

      {/* Score input */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Score:</label>
        <input
          type="number"
          min={0}
          max={answer.maxScore}
          value={score ?? ''}
          onChange={(e) => {
            const v = e.target.value === '' ? null : Math.min(answer.maxScore, Math.max(0, Number(e.target.value)));
            onScoreChange(v);
          }}
          className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="0"
        />
        <span className="text-sm text-gray-500">/ {answer.maxScore}</span>
      </div>
    </div>
  );
}

/** Renders programming answer card with code viewer + score input */
function ProgrammingAnswerCard({ answer, score, onScoreChange }) {
  const lang = answer.language || 'javascript';
  const code = answer.code || '';
  const results = answer.lastRunResult;

  return (
    <div className="space-y-3">
      {/* Language badge */}
      <div className="flex items-center gap-2">
        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300 font-mono">{lang}</span>
        {!code && <span className="text-xs text-gray-400 italic">No code submitted.</span>}
      </div>

      {/* Code viewer */}
      {code ? (
        <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 280 }}>
          <Editor
            value={code}
            language={lang}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>
      ) : null}

      {/* Test run results (if available) */}
      {results && Array.isArray(results) && results.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Run Results</p>
          <div className="grid gap-1">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-xs font-mono
                ${r.passed ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <span>{r.passed ? '✓' : '✗'}</span>
                <span>Case {i + 1}</span>
                {r.expected != null && (
                  <span className="text-gray-500">
                    expected <span className="font-semibold">{String(r.expected)}</span>
                    {r.actual != null && <> · got <span className="font-semibold">{String(r.actual)}</span></>}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visible test cases from question */}
      {answer.question?.testCases?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Test Cases</p>
          <div className="grid gap-1">
            {answer.question.testCases.map((tc, i) => (
              <div key={i} className="rounded border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-mono">
                <span className="text-gray-500">Input:</span> {tc.input}
                <span className="text-gray-300 mx-1">·</span>
                <span className="text-gray-500">Expected:</span> {tc.expectedOutput}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score input */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Score:</label>
        <input
          type="number"
          min={0}
          max={answer.maxScore}
          value={score ?? ''}
          onChange={(e) => {
            const v = e.target.value === '' ? null : Math.min(answer.maxScore, Math.max(0, Number(e.target.value)));
            onScoreChange(v);
          }}
          className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="0"
        />
        <span className="text-sm text-gray-500">/ {answer.maxScore}</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GradeSubmission() {
  const { examId, studentId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  // scores state: questionId → score (number|null)
  const [scores, setScores] = useState({});

  useEffect(() => {
    api.get(`/exam-schedules/${examId}/attempts/${studentId}`)
      .then((r) => {
        setAttempt(r.data);
        // Initialise scores from existing answer.score values
        const init = {};
        for (const a of r.data.answers ?? []) {
          init[a.questionId] = a.score ?? null;
        }
        setScores(init);
      })
      .catch(() => setError('Failed to load attempt.'))
      .finally(() => setLoading(false));
  }, [examId, studentId]);

  const manualAnswers = (attempt?.answers ?? []).filter(
    (a) => a.question?.type === 'descriptive' || a.question?.type === 'programming',
  );
  const allFilled = manualAnswers.every((a) => scores[a.questionId] != null);

  const totalScore = (attempt?.answers ?? []).reduce((sum, a) => {
    const s = scores[a.questionId] ?? a.score ?? 0;
    return sum + s;
  }, 0);
  const maxScore = (attempt?.answers ?? []).reduce((sum, a) => sum + (a.maxScore ?? 0), 0);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const scoreList = manualAnswers.map((a) => ({
        questionId: a.questionId,
        score: scores[a.questionId] ?? 0,
      }));
      await api.post(`/exam-schedules/${examId}/attempts/${studentId}/grade`, {
        attemptId: attempt._id,
        scores: scoreList,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save grades.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading attempt…</p>
      </div>
    );
  }

  if (!attempt || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-red-500">{error || 'Attempt not found.'}</p>
      </div>
    );
  }

  const studentName = attempt.studentName || attempt.studentId;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(`/exams/${examId}/results`)}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Results
        </button>
        <span className="text-gray-300">|</span>
        <h1 className="text-base font-semibold text-gray-900">Grade Submission</h1>
        <span className="text-sm text-gray-600">{studentName}</span>
        <StatusBadge status={attempt.status} />
        {attempt.paperTitle && (
          <span className="ml-auto text-xs text-gray-400">{attempt.paperTitle}</span>
        )}
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* Score summary */}
        <div className="rounded-xl bg-white border border-gray-200 px-6 py-4 flex items-center gap-6 shadow-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Running Total</p>
            <p className={`text-2xl font-bold ${totalScore / maxScore >= 0.6 ? 'text-green-600' : 'text-red-500'}`}>
              {totalScore} / {maxScore}
              <span className="ml-1 text-sm font-normal text-gray-400">
                ({maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0}%)
              </span>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            <span className="rounded-full px-2 py-0.5 bg-blue-50 text-blue-700">MCQ = auto-graded</span>
            <span className="rounded-full px-2 py-0.5 bg-amber-50 text-amber-700">Descriptive / Programming = manual</span>
          </div>
        </div>

        {/* Question cards */}
        {attempt.answers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">No answers submitted.</p>
          </div>
        ) : (
          attempt.answers.map((answer, idx) => {
            const q = answer.question;
            const type = q?.type ?? answer.type;
            const isManual = type === 'descriptive' || type === 'programming';

            return (
              <div
                key={answer.questionId}
                className={`rounded-xl bg-white border shadow-sm overflow-hidden ${
                  isManual ? 'border-gray-200' : 'border-gray-100 opacity-90'
                }`}
              >
                {/* Card header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
                  <span className="mt-0.5 text-xs font-semibold text-gray-400 w-5 flex-shrink-0">
                    Q{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {q?.body ? (
                      <div
                        className="text-sm text-gray-800 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: q.body }}
                      />
                    ) : (
                      <p className="text-sm text-gray-400 italic">Question not available.</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[type] ?? type}
                    </span>
                    <span className="text-xs text-gray-500">{answer.maxScore} pts</span>
                  </div>
                </div>

                {/* Answer section */}
                <div className="px-5 py-4">
                  {(type === 'mcq-single' || type === 'mcq-multiple') && (
                    <McqAnswerCard answer={answer} qIndex={idx} />
                  )}
                  {type === 'descriptive' && (
                    <DescriptiveAnswerCard
                      answer={answer}
                      score={scores[answer.questionId]}
                      onScoreChange={(v) => setScores((prev) => ({ ...prev, [answer.questionId]: v }))}
                    />
                  )}
                  {type === 'programming' && (
                    <ProgrammingAnswerCard
                      answer={answer}
                      score={scores[answer.questionId]}
                      onScoreChange={(v) => setScores((prev) => ({ ...prev, [answer.questionId]: v }))}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky footer */}
      {manualAnswers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center gap-4 z-20">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && <p className="text-sm text-green-600 font-medium">Grades saved!</p>}
          {!allFilled && (
            <p className="text-sm text-amber-600">
              {manualAnswers.filter((a) => scores[a.questionId] == null).length} answer(s) not yet scored.
            </p>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Total: <strong>{totalScore} / {maxScore}</strong>
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Grades'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
