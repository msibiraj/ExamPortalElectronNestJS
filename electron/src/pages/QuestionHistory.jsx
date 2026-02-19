import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function QuestionHistory() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    api.get(`/questions/${id}/history`)
      .then((res) => setHistory(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRestore = async (version) => {
    if (!confirm(`Restore version v${version}? A new version will be created with that content.`)) return;
    setRestoring(true);
    try {
      await api.post(`/questions/${id}/restore`, { version });
      navigate(`/questions/${id}/edit`);
    } catch (err) {
      alert(err.response?.data?.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(`/questions/${id}/edit`)} className="text-sm text-gray-500 hover:text-gray-800">
          ← Back to Editor
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Version History</h1>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-8 flex gap-6">
        {/* Version list */}
        <div className="w-72 flex-shrink-0">
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400">No versions found.</p>
          ) : (
            <div className="space-y-2">
              {history.map((v) => (
                <div
                  key={v._id}
                  className={`rounded-lg border p-3 cursor-pointer hover:border-indigo-300 ${
                    previewVersion?._id === v._id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'
                  }`}
                  onClick={() => setPreviewVersion(v)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">v{v.version}</span>
                    <span className={`text-xs rounded-full px-2 py-0.5 ${
                      v.status === 'published' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {new Date(v.createdAt).toLocaleString()}
                  </div>
                  {v.changedFields?.length > 0 && (
                    <div className="mt-1 text-xs text-gray-400">
                      Changed: {v.changedFields.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className="flex-1 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-6">
          {!previewVersion ? (
            <p className="text-sm text-gray-400">Select a version on the left to preview it.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">v{previewVersion.version} Preview</h2>
                <button
                  onClick={() => handleRestore(previewVersion.version)}
                  disabled={restoring}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {restoring ? 'Restoring...' : 'Restore this version'}
                </button>
              </div>
              <div className="space-y-3 text-sm">
                {Object.entries(previewVersion.snapshot || {})
                  .filter(([k]) => !['_id', 'createdAt', 'updatedAt', '__v'].includes(k))
                  .map(([key, val]) => (
                    <div key={key} className="border-b border-gray-100 pb-2">
                      <span className="font-medium text-gray-700">{key}: </span>
                      <span className="text-gray-600 break-all">
                        {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
