import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';

const WELCOME_MESSAGE = {
  role: 'model',
  parts: [{ text: '{"message":"Hi! I\'m your AI question generator. Tell me what you need — for example: \\"Generate 5 hard React hooks MCQ questions\\" or \\"I need easy Python programming questions\\". I can also suggest topics based on what\'s already in your question bank.","questions":null}' }],
  parsed: {
    message: "Hi! I'm your AI question generator. Tell me what you need — for example: \"Generate 5 hard React hooks MCQ questions\" or \"I need easy Python programming questions\". I can also suggest topics based on what's already in your question bank.",
    questions: null,
  },
};

const TYPE_COLORS = {
  'mcq-single': 'bg-blue-100 text-blue-700',
  'mcq-multiple': 'bg-purple-100 text-purple-700',
  descriptive: 'bg-amber-100 text-amber-700',
  programming: 'bg-green-100 text-green-700',
};

const DIFF_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-red-100 text-red-700',
};

function QuestionCard({ question, onAdd, added }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[question.type] || 'bg-gray-100 text-gray-600'}`}>
              {question.type}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFF_COLORS[question.difficulty] || 'bg-gray-100 text-gray-600'}`}>
              {question.difficulty}
            </span>
            <span className="rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-600">
              {question.marks} mark{question.marks !== 1 ? 's' : ''}
            </span>
            {question.topic && (
              <span className="rounded-full px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600">
                {question.topic}
              </span>
            )}
          </div>
          <p className="text-gray-800 leading-snug">{question.body}</p>
        </div>
      </div>

      {question.options?.length > 0 && (
        <div className="mt-2 space-y-1">
          {question.options.map((opt, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${opt.isCorrect ? 'bg-green-50 text-green-800 font-medium' : 'text-gray-600'}`}
            >
              <span className="w-4 shrink-0">{String.fromCharCode(65 + i)}.</span>
              <span>{opt.text}</span>
              {opt.isCorrect && <span className="ml-auto text-green-600">✓</span>}
            </div>
          ))}
        </div>
      )}

      {question.explanation && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-indigo-500 hover:text-indigo-700"
          >
            {expanded ? 'Hide explanation' : 'Show explanation'}
          </button>
          {expanded && (
            <p className="mt-1 text-xs text-gray-500 bg-gray-50 rounded p-2">
              {question.explanation}
            </p>
          )}
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <button
          onClick={() => onAdd(question)}
          disabled={added}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
            added
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {added ? 'Added to Bank' : 'Add to Bank'}
        </button>
      </div>
    </div>
  );
}

export default function AIChatbot({ onClose, onQuestionsAdded }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set());
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // History formatted for Gemini API (exclude welcome since it's a fake bootstrap)
  const getApiHistory = () =>
    messages
      .slice(1) // skip welcome message
      .map((m) => ({
        role: m.role,
        parts: m.parts,
      }));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      });

      const aiMsg = {
        role: 'model',
        parts: [{ text: JSON.stringify(res.data) }],
        parsed: res.data,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get AI response. Check your Gemini API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addQuestion = async (question) => {
    const key = JSON.stringify(question);
    try {
      await api.post('/questions', { ...question, status: 'draft' });
      setAddedIds((prev) => new Set([...prev, key]));
      onQuestionsAdded?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add question');
    }
  };

  const addAllQuestions = async (questions) => {
    for (const q of questions) {
      const key = JSON.stringify(q);
      if (!addedIds.has(key)) {
        await addQuestion(q);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex flex-col w-full max-w-lg bg-gray-50 shadow-2xl h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
              AI
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Question Generator</div>
              <div className="text-xs text-gray-400">Powered by Gemini</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const parsed = msg.parsed;

            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${isUser ? '' : 'w-full'}`}>
                  {/* Text bubble */}
                  {parsed?.message && (
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      {parsed.message}
                    </div>
                  )}

                  {/* Generated question cards */}
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
                        <button
                          onClick={() => addAllQuestions(parsed.questions)}
                          className="w-full rounded-lg border border-indigo-200 bg-indigo-50 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                        >
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
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {[
            '5 easy MCQ on Python basics',
            '3 hard React hooks questions',
            '2 descriptive SQL questions',
            'Suggest underrepresented topics',
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what questions you need..."
              rows={2}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
