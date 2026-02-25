import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function StatusBadge({ status }) {
  const cls =
    status === 'submitted' ? 'bg-green-100 text-green-700' :
    status === 'timed-out' ? 'bg-amber-100 text-amber-700' :
    'bg-gray-100 text-gray-500';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status === 'timed-out' ? 'Timed Out' : status === 'in-progress' ? 'Not Submitted' : status}
    </span>
  );
}

export default function ExamResults() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/exam-schedules/${examId}`).then((r) => setExam(r.data)).catch(() => {}),
      api.get(`/exam-schedules/${examId}/attempts`).then((r) => setAttempts(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [examId]);

  const submitted = attempts.filter((a) => a.status === 'submitted').length;
  const notAttended = attempts.filter((a) => a.status === 'in-progress').length;
  const gradedAttempts = attempts.filter((a) => a.maxScore > 0 && a.score != null);
  const avgScore = gradedAttempts.length
    ? Math.round(gradedAttempts.reduce((s, a) => s + (a.score / a.maxScore) * 100, 0) / gradedAttempts.length)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/exams')} className="text-sm text-gray-500 hover:text-gray-800">
          ← Exams
        </button>
        <span className="text-gray-300">|</span>
        <h1 className="text-base font-semibold text-gray-900">
          {exam ? exam.title : 'Results'}
        </h1>
        {exam && (
          <span className="text-xs text-gray-400">
            {new Date(exam.scheduledAt).toLocaleString()} · {exam.durationMinutes} min
          </span>
        )}
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {loading && <p className="text-sm text-gray-400 text-center py-16">Loading results…</p>}

        {!loading && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl bg-white border border-gray-200 p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{attempts.length}</div>
                <div className="text-xs text-gray-500 mt-1">Enrolled</div>
              </div>
              <div className="rounded-xl bg-white border border-gray-200 p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-green-600">{submitted}</div>
                <div className="text-xs text-gray-500 mt-1">Submitted</div>
              </div>
              <div className="rounded-xl bg-white border border-gray-200 p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-gray-400">{notAttended}</div>
                <div className="text-xs text-gray-500 mt-1">Not Submitted</div>
              </div>
              <div className="rounded-xl bg-white border border-gray-200 p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-indigo-600">
                  {avgScore != null ? `${avgScore}%` : '—'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Avg Score</div>
              </div>
            </div>

            {/* Attempts table */}
            {attempts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-sm">No attempts recorded for this exam.</p>
              </div>
            ) : (
              <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Answers</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted At</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Violations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attempts.map((attempt) => {
                      const hasScore = attempt.maxScore != null && attempt.maxScore > 0;
                      const pct = hasScore ? Math.round((attempt.score / attempt.maxScore) * 100) : null;
                      const sid = attempt.studentId || attempt._id;
                      return (
                      <tr key={attempt._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800 font-medium">
                          {attempt.studentName || attempt.studentId}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={attempt.status} />
                        </td>
                        <td className="px-4 py-3">
                          {hasScore ? (
                            <span className={`font-semibold ${pct >= 60 ? 'text-green-600' : 'text-red-500'}`}>
                              {attempt.score} / {attempt.maxScore}
                              <span className="ml-1 text-xs font-normal text-gray-400">({pct}%)</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {attempt.answers?.length ?? 0} answer{attempt.answers?.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {attempt.submittedAt
                            ? new Date(attempt.submittedAt).toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/exams/${examId}/violations/${sid}`)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
