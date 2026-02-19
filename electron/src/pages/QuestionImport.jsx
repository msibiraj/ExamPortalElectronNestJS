import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function QuestionImport() {
  const navigate = useNavigate();
  const [format, setFormat] = useState('csv');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [importStatus, setImportStatus] = useState('draft');
  const [topicMappingRaw, setTopicMappingRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setFileContent(ev.target.result);
    reader.readAsText(file);
  };

  const parseTopicMapping = () => {
    const mapping = {};
    topicMappingRaw.split('\n').forEach((line) => {
      const [from, to] = line.split('->').map((s) => s.trim());
      if (from && to) mapping[from] = to;
    });
    return mapping;
  };

  const handleImport = async () => {
    if (!fileContent) {
      setError('Please select a file first.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/questions/import', {
        format,
        content: fileContent,
        importStatus,
        topicMapping: parseTopicMapping(),
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/questions')} className="text-sm text-gray-500 hover:text-gray-800">
          ← Question Bank
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Import Questions</h1>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-6 space-y-6">

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File Format</label>
            <div className="flex gap-4">
              {[
                { value: 'csv', label: 'ProctorPlatform CSV' },
                { value: 'moodle-xml', label: 'Moodle XML' },
                { value: 'qti', label: 'QTI 2.1' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="format"
                    value={opt.value}
                    checked={format === opt.value}
                    onChange={() => setFormat(opt.value)}
                    className="accent-indigo-600"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 px-6 py-4 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                <input type="file" className="sr-only" accept=".csv,.xml" onChange={handleFile} />
                {fileName ? (
                  <span className="text-gray-800 font-medium">{fileName}</span>
                ) : (
                  'Click to choose file (.csv or .xml)'
                )}
              </label>
            </div>
          </div>

          {/* Topic mapping */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic Mapping <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              One mapping per line in format: <code className="bg-gray-100 px-1 rounded">Source Topic -{'>'} Platform Topic</code>
            </p>
            <textarea
              rows={4}
              placeholder={'Sorting Algorithms -> Data Structures > Sorting\nGraphs -> Data Structures > Graphs'}
              value={topicMappingRaw}
              onChange={(e) => setTopicMappingRaw(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Import status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Import as</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="importStatus"
                  value="draft"
                  checked={importStatus === 'draft'}
                  onChange={() => setImportStatus('draft')}
                  className="accent-indigo-600"
                />
                <div>
                  <span className="font-medium">Draft</span>
                  <p className="text-xs text-gray-400">Review and publish individually. Recommended.</p>
                </div>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="importStatus"
                  value="published"
                  checked={importStatus === 'published'}
                  onChange={() => setImportStatus('published')}
                  className="accent-indigo-600"
                />
                <div>
                  <span className="font-medium">Published</span>
                  <p className="text-xs text-gray-400">Immediately available in templates.</p>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4">
              <p className="text-sm font-semibold text-green-800 mb-2">Import complete</p>
              <p className="text-sm text-green-700">✔ {result.imported} questions imported successfully.</p>
              {result.skipped?.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-amber-700">⚠ {result.skipped.length} questions skipped:</p>
                  <ul className="mt-1 space-y-1">
                    {result.skipped.map((s, i) => (
                      <li key={i} className="text-xs text-amber-600">
                        Row {s.index + 1}: {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={() => navigate('/questions')}
                className="mt-3 rounded-lg bg-green-700 px-4 py-1.5 text-sm text-white hover:bg-green-800"
              >
                View Imported Questions
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => navigate('/questions')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !fileContent}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Start Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
