import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';

// ─── Sanitizer: ensures generated questions pass all backend validations ───────

const VALID_TYPES = ['mcq-single', 'mcq-multiple', 'descriptive', 'programming'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

const DEFAULT_MARKS = { 'mcq-single': 2, 'mcq-multiple': 2, descriptive: 5, programming: 10 };

function sanitizeQuestion(q) {
  const type = VALID_TYPES.includes(q.type) ? q.type : 'mcq-single';
  const difficulty = VALID_DIFFICULTIES.includes(q.difficulty) ? q.difficulty : 'medium';
  const marks = Number.isInteger(q.marks) && q.marks > 0 ? q.marks : DEFAULT_MARKS[type];
  const tags = Array.isArray(q.tags) ? q.tags.filter((t) => typeof t === 'string') : [];
  const topic = typeof q.topic === 'string' && q.topic.trim() ? q.topic.trim() : 'General';
  const body = typeof q.body === 'string' && q.body.trim() ? q.body.trim() : '';

  const base = { type, difficulty, marks, tags, topic, body };

  // MCQ validation
  if (type === 'mcq-single' || type === 'mcq-multiple') {
    let options = Array.isArray(q.options) ? q.options.slice(0, 4) : [];

    // Ensure exactly 4 options
    while (options.length < 4) {
      options.push({ text: `Option ${options.length + 1}`, isCorrect: false });
    }
    options = options.map((o) => ({ text: String(o.text || ''), isCorrect: Boolean(o.isCorrect) }));

    // Ensure at least one correct option
    const hasCorrect = options.some((o) => o.isCorrect);
    if (!hasCorrect) options[0].isCorrect = true;

    // mcq-single: keep only first correct answer
    if (type === 'mcq-single') {
      let foundFirst = false;
      options = options.map((o) => {
        if (o.isCorrect && !foundFirst) { foundFirst = true; return o; }
        return { ...o, isCorrect: false };
      });
    }

    return { ...base, options, explanation: q.explanation || '' };
  }

  // Programming validation
  if (type === 'programming') {
    let testCases = Array.isArray(q.testCases) ? q.testCases : [];

    // Ensure at least one test case
    if (testCases.length === 0) {
      testCases = [
        { input: '1', expectedOutput: '1', weight: 50, isHidden: false },
        { input: '2', expectedOutput: '2', weight: 50, isHidden: true },
      ];
    }

    // Normalize weights to sum to exactly 100
    const rawTotal = testCases.reduce((s, tc) => s + (Number(tc.weight) || 0), 0);
    if (rawTotal === 0) {
      const even = Math.floor(100 / testCases.length);
      testCases = testCases.map((tc, i) => ({
        ...tc,
        weight: i === testCases.length - 1 ? 100 - even * (testCases.length - 1) : even,
      }));
    } else if (rawTotal !== 100) {
      // Scale weights proportionally so they sum to 100
      let scaled = testCases.map((tc) => ({
        ...tc,
        weight: Math.floor(((Number(tc.weight) || 0) / rawTotal) * 100),
      }));
      const diff = 100 - scaled.reduce((s, tc) => s + tc.weight, 0);
      scaled[scaled.length - 1].weight += diff; // adjust last to fix rounding
      testCases = scaled;
    }

    testCases = testCases.map((tc) => ({
      input: String(tc.input ?? ''),
      expectedOutput: String(tc.expectedOutput ?? ''),
      weight: Number(tc.weight),
      isHidden: Boolean(tc.isHidden),
    }));

    return {
      ...base,
      testCases,
      allowedLanguages: Array.isArray(q.allowedLanguages) ? q.allowedLanguages : ['python'],
      timeLimits: q.timeLimits && typeof q.timeLimits === 'object' ? q.timeLimits : { python: 2000 },
      memoryLimit: Number(q.memoryLimit) || 256,
      starterCode: q.starterCode && typeof q.starterCode === 'object' ? q.starterCode : {},
      referenceLanguage: q.referenceLanguage || 'python',
      referenceSolution: q.referenceSolution || '',
      explanation: q.explanation || '',
    };
  }

  // Descriptive
  return {
    ...base,
    markingRubric: q.markingRubric || '',
    minWords: Number(q.minWords) || undefined,
    maxWords: Number(q.maxWords) || undefined,
    explanation: q.explanation || '',
  };
}

const WELCOME_MESSAGE = {
  role: 'model',
  parts: [{ text: '' }],
  parsed: {
    message: "Hi! I can generate exam questions in two ways:\n\n1. Upload a PDF or DOCX — I'll extract topics and generate questions from your content.\n2. Just tell me what you need directly — e.g. \"5 hard React hooks MCQs\".",
    questions: null,
  },
};

const TYPE_COLORS = {
  'mcq-single':   'bg-blue-100 text-blue-700',
  'mcq-multiple': 'bg-purple-100 text-purple-700',
  descriptive:    'bg-amber-100 text-amber-700',
  programming:    'bg-green-100 text-green-700',
};
const DIFF_COLORS = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
};

// ─── Question Preview Cards ───────────────────────────────────────────────────

function McqCard({ question }) {
  return (
    <div className="mt-2 space-y-1">
      {(question.options || []).map((opt, i) => (
        <div key={i} className={`flex items-start gap-2 rounded px-2 py-1 text-xs ${opt.isCorrect ? 'bg-green-50 text-green-800 font-medium' : 'text-gray-600'}`}>
          <span className="w-4 shrink-0 font-medium">{String.fromCharCode(65 + i)}.</span>
          <span>{opt.text}</span>
          {opt.isCorrect && <span className="ml-auto text-green-600">✓</span>}
        </div>
      ))}
    </div>
  );
}

function ProgrammingCard({ question }) {
  const [tab, setTab] = useState('problem');
  const lang = question.referenceLanguage || question.allowedLanguages?.[0] || 'python';

  return (
    <div className="mt-2">
      <div className="flex gap-1 text-xs mb-1.5">
        {['problem', 'starter', 'solution', 'tests'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded px-2 py-0.5 capitalize ${tab === t ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'problem' && (
        <pre className="whitespace-pre-wrap text-xs bg-gray-50 rounded p-2 text-gray-700 max-h-40 overflow-y-auto">{question.body}</pre>
      )}
      {tab === 'starter' && (
        <pre className="whitespace-pre-wrap text-xs bg-gray-900 text-green-300 rounded p-2 max-h-40 overflow-y-auto">
          {question.starterCode?.[lang] || 'No starter code'}
        </pre>
      )}
      {tab === 'solution' && (
        <pre className="whitespace-pre-wrap text-xs bg-gray-900 text-green-300 rounded p-2 max-h-40 overflow-y-auto">
          {question.referenceSolution || 'No reference solution'}
        </pre>
      )}
      {tab === 'tests' && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {(question.testCases || []).map((tc, i) => (
            <div key={i} className={`rounded px-2 py-1 text-xs ${tc.isHidden ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-800'}`}>
              <span className="font-medium">{tc.isHidden ? 'Hidden' : 'Visible'}</span>
              {' · '}In: <code>{tc.input}</code>
              {' → '}Out: <code>{tc.expectedOutput}</code>
              {' · '}{tc.weight}pts
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DescriptiveCard({ question }) {
  return (
    <div className="mt-2 space-y-1 text-xs text-gray-600">
      {question.markingRubric && (
        <div className="rounded bg-amber-50 px-2 py-1">
          <span className="font-medium text-amber-700">Rubric: </span>{question.markingRubric}
        </div>
      )}
      {(question.minWords || question.maxWords) && (
        <div className="text-gray-400">
          Word limit: {question.minWords || 0}–{question.maxWords || '∞'} words
        </div>
      )}
    </div>
  );
}

function QuestionCard({ question, onAdd, added }) {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm">
      <div className="flex flex-wrap gap-1 mb-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[question.type] || 'bg-gray-100 text-gray-600'}`}>{question.type}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFF_COLORS[question.difficulty] || 'bg-gray-100'}`}>{question.difficulty}</span>
        <span className="rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-600">{question.marks} mark{question.marks !== 1 ? 's' : ''}</span>
        {question.topic && <span className="rounded-full px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600">{question.topic}</span>}
        {question.allowedLanguages?.length > 0 && (
          <span className="rounded-full px-2 py-0.5 text-xs bg-green-50 text-green-600">{question.allowedLanguages.join(', ')}</span>
        )}
      </div>

      <p className="text-gray-800 text-sm leading-snug">{question.body?.slice(0, 200)}{question.body?.length > 200 ? '...' : ''}</p>

      {question.type === 'programming'   && <ProgrammingCard question={question} />}
      {(question.type === 'mcq-single' || question.type === 'mcq-multiple') && <McqCard question={question} />}
      {question.type === 'descriptive'   && <DescriptiveCard question={question} />}

      {question.explanation && (
        <div className="mt-2">
          <button onClick={() => setShowExplanation(!showExplanation)} className="text-xs text-indigo-500 hover:text-indigo-700">
            {showExplanation ? 'Hide explanation' : 'Show explanation'}
          </button>
          {showExplanation && <p className="mt-1 text-xs text-gray-500 bg-gray-50 rounded p-2">{question.explanation}</p>}
        </div>
      )}

      <div className="mt-2.5 flex justify-end">
        <button onClick={() => onAdd(question)} disabled={added}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${added ? 'bg-green-100 text-green-700 cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
          {added ? 'Added to Bank' : 'Add to Bank'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Chatbot ─────────────────────────────────────────────────────────────

export default function AIChatbot({ onClose, onQuestionsAdded }) {
  const [messages, setMessages]     = useState([WELCOME_MESSAGE]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [addedIds, setAddedIds]     = useState(new Set());
  const [error, setError]           = useState('');

  // Document state
  const [uploading, setUploading]   = useState(false);
  const [document, setDocument]     = useState(null);   // { documentId, filename, chunkCount }

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const fileRef    = useRef(null);

  const getApiHistory = () =>
    messages.slice(1).map((m) => ({ role: m.role, parts: m.parts }));

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── Document Upload ──────────────────────────────────────────────────────────

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/ai/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocument(res.data);

      // Add a system message in chat showing the document was loaded
      setMessages((prev) => [...prev, {
        role: 'model',
        parts: [{ text: '' }],
        parsed: {
          message: `Document loaded: **${res.data.filename}**\n\n${res.data.chunkCount} chunks indexed. Just ask me to generate questions — I'll automatically find the most relevant sections.`,
          questions: null,
        },
      }]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process document.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const clearDocument = () => {
    setDocument(null);
  };

  // ── Send Message ─────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = {
      role: 'user',
      parts: [{ text }],
      parsed: { message: text, questions: null },
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/ai/chat', {
        message: text,
        history: getApiHistory(),
        documentId: document?.documentId || undefined,
      });

      setMessages((prev) => [...prev, {
        role: 'model',
        parts: [{ text: JSON.stringify(res.data) }],
        parsed: res.data,
      }]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get AI response. Check your Gemini API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Add to Bank ──────────────────────────────────────────────────────────────

  const addQuestion = async (question) => {
    const key = JSON.stringify(question);
    const sanitized = sanitizeQuestion(question);
    try {
      await api.post('/questions', { ...sanitized, status: 'draft' });
      setAddedIds((prev) => new Set([...prev, key]));
      onQuestionsAdded?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add question');
    }
  };

  const addAll = async (questions) => {
    for (const q of questions) {
      if (!addedIds.has(JSON.stringify(q))) await addQuestion(q);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const suggestions = document
    ? ['5 MCQs from this document', '3 hard descriptive questions', '2 programming questions', 'What topics does this cover?']
    : ['5 easy MCQ on Python basics', '3 hard React hooks questions', '2 descriptive SQL questions', 'What topics should I add?'];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative flex flex-col w-full max-w-lg bg-gray-50 shadow-2xl h-full">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">AI</div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Question Generator</div>
              <div className="text-xs text-gray-400">
                {document ? `📄 ${document.filename}` : 'Powered by Gemini'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {document && (
              <button onClick={clearDocument} className="text-xs text-gray-400 hover:text-red-500">✕ Remove doc</button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">✕</button>
          </div>
        </div>

        {/* ── Document badge (shown after upload) ── */}
        {document && (
          <div className="border-b border-gray-200 bg-violet-50 px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-violet-700 font-medium">📄 {document.filename}</span>
            <span className="text-xs text-gray-400">· {document.chunkCount} chunks indexed</span>
            <span className="text-xs text-gray-400 ml-1">· Relevant sections retrieved automatically</span>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const parsed = msg.parsed;

            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] ${isUser ? '' : 'w-full'}`}>
                  {parsed?.message && (
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                    }`}>
                      {parsed.message}
                    </div>
                  )}

                  {parsed?.questions?.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {parsed.questions.map((q, qi) => (
                        <QuestionCard
                          key={qi}
                          question={q}
                          onAdd={addQuestion}
                          added={addedIds.has(JSON.stringify(q))}
                        />
                      ))}
                      {parsed.questions.length > 1 && (
                        <button onClick={() => addAll(parsed.questions)}
                          className="w-full rounded-lg border border-indigo-200 bg-indigo-50 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                          Add All {parsed.questions.length} Questions to Bank
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Suggestion chips ── */}
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setInput(s)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50">
              {s}
            </button>
          ))}
        </div>

        {/* ── Input area ── */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          {/* Upload button */}
          <div className="mb-2 flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={handleFileChange} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              {uploading ? 'Processing...' : '📎 Upload PDF / DOCX'}
            </button>
            {document && (
              <span className="text-xs text-green-600 font-medium">✓ {document.filename}</span>
            )}
          </div>

          <div className="flex gap-2 items-end">
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={document ? 'Ask me to generate questions from this document...' : 'Ask me to generate questions...'}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Send
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
