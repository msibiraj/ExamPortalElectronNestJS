import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const TYPE_LABELS = {
  'mcq-single': 'MCQ Single',
  'mcq-multiple': 'MCQ Multiple',
  descriptive: 'Descriptive',
  programming: 'Programming',
};

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-red-100 text-red-700',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-blue-100 text-blue-700',
  archived: 'bg-zinc-100 text-zinc-500',
};

export default function QuestionBank() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [error, setError] = useState('');

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (filterType) params.types = [filterType];
      if (filterDifficulty) params.difficulties = [filterDifficulty];
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/questions', { params });
      setQuestions(res.data);
    } catch {
      setError('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterDifficulty, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(fetchQuestions, 300);
    return () => clearTimeout(timer);
  }, [fetchQuestions]);

  const handlePublish = async (id) => {
    try {
      await api.post(`/questions/${id}/publish`);
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Publish failed');
    }
  };

  const handleArchive = async (id) => {
    if (!confirm('Archive this question? It will be hidden from templates.')) return;
    await api.delete(`/questions/${id}`);
    fetchQuestions();
  };

  const handleDuplicate = async (id) => {
    await api.post(`/questions/${id}/duplicate`);
    fetchQuestions();
  };

  const handleExportCsv = async () => {
    const res = await api.get('/questions/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map((q) => q._id));
    }
  };

  const handleBulkPublish = async () => {
    if (!confirm(`Publish ${selectedIds.length} selected question(s)?`)) return;
    try {
      const res = await api.post('/questions/bulk-publish', { questionIds: selectedIds });
      const { published, failed } = res.data;
      if (failed.length > 0) {
        alert(
          `Published ${published}, failed ${failed.length}:\n` +
          failed.map((f) => `• ${f.reason}`).join('\n'),
        );
      }
      setSelectedIds([]);
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk publish failed');
    }
  };

  const handleBulkTag = async () => {
    const tags = bulkTagInput.split(',').map((t) => t.trim()).filter(Boolean);
    if (!tags.length) return;
    await api.post('/questions/bulk-tag', { questionIds: selectedIds, tags });
    setBulkTagInput('');
    setShowBulkTag(false);
    setSelectedIds([]);
    fetchQuestions();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ← Dashboard
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Question Bank</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCsv}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => navigate('/questions/import')}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Import Questions
          </button>
          <button
            onClick={() => navigate('/questions/new')}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add Question
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search questions and tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="mcq-single">MCQ Single</option>
            <option value="mcq-multiple">MCQ Multiple</option>
            <option value="descriptive">Descriptive</option>
            <option value="programming">Programming</option>
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Bulk action bar */}
        {selectedIds.length > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2">
            <span className="text-sm font-medium text-indigo-800">
              {selectedIds.length} selected
            </span>
            {showBulkTag ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="tag1, tag2, tag3"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  className="rounded border border-indigo-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={handleBulkTag}
                  className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
                >
                  Apply Tags
                </button>
                <button
                  onClick={() => setShowBulkTag(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowBulkTag(true)}
                  className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
                >
                  Bulk Tag
                </button>
                <button
                  onClick={handleBulkPublish}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                >
                  Bulk Publish
                </button>
              </>
            )}
            <button
              onClick={() => setSelectedIds([])}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === questions.length && questions.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Question</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Difficulty</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Marks</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Version</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Tags</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    No questions found. Click <strong>+ Add Question</strong> to create one.
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(q._id)}
                        onChange={() => toggleSelect(q._id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-start gap-2">
                        {q.flaggedForReview && (
                          <span title="Review needed" className="mt-0.5 text-amber-500 text-xs">⚑</span>
                        )}
                        <span className="line-clamp-2 text-gray-800">
                          {q.body?.replace(/<[^>]+>/g, '').slice(0, 120)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-gray-400">{q.topic}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {TYPE_LABELS[q.type] || q.type}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty]}`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{q.marks}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[q.status]}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">v{q.currentVersion}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(q.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                            {tag}
                          </span>
                        ))}
                        {q.tags?.length > 3 && (
                          <span className="text-xs text-gray-400">+{q.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/questions/${q._id}/edit`)}
                          title="Edit"
                          className="rounded p-1 text-gray-500 hover:bg-gray-100"
                        >
                          ✏️
                        </button>
                        {q.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(q._id)}
                            title="Publish"
                            className="rounded px-2 py-0.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicate(q._id)}
                          title="Duplicate"
                          className="rounded p-1 text-gray-500 hover:bg-gray-100"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => navigate(`/questions/${q._id}/history`)}
                          title="Version history"
                          className="rounded p-1 text-gray-500 hover:bg-gray-100"
                        >
                          🕐
                        </button>
                        {q.status !== 'archived' && (
                          <button
                            onClick={() => handleArchive(q._id)}
                            title="Archive"
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-gray-400">
          {questions.length} question{questions.length !== 1 ? 's' : ''} found
        </div>
      </div>
    </div>
  );
}
