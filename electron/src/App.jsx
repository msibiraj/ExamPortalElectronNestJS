import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import QuestionBank from './pages/QuestionBank';
import QuestionEditor from './pages/QuestionEditor';
import QuestionHistory from './pages/QuestionHistory';
import QuestionImport from './pages/QuestionImport';
import LiveMonitor from './pages/LiveMonitor';
import MonitorList from './pages/MonitorList';
import ExamSession from './pages/ExamSession';
import ExamBuilder from './pages/ExamBuilder';
import ExamScheduler from './pages/ExamScheduler';
import ExamsList from './pages/ExamsList';
import ExamResults from './pages/ExamResults';
import ViolationReview from './pages/ViolationReview';
import GradeSubmission from './pages/GradeSubmission';
import Unauthorized from './pages/Unauthorized';
import UserManagement from './pages/admin/UserManagement';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

/** Any authenticated user */
function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

/** Only admin + proctor */
function ProctorOnly({ children }) {
  return <ProtectedRoute allowedRoles={['admin', 'proctor']}>{children}</ProtectedRoute>;
}

/** Only admin */
function AdminOnly({ children }) {
  return <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>;
}

/** Root redirect: student → /student, proctor/admin → /dashboard */
function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'student') return <Navigate to="/student" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Root — redirects to role-specific home */}
      <Route path="/" element={<RoleHome />} />

      {/* Proctor / Admin home */}
      <Route path="/dashboard" element={<ProctorOnly><Dashboard /></ProctorOnly>} />

      {/* Student home */}
      <Route path="/student" element={<Protected><StudentDashboard /></Protected>} />

      {/* Question Bank — proctor + admin only */}
      <Route path="/questions"              element={<ProctorOnly><QuestionBank /></ProctorOnly>} />
      <Route path="/questions/new"          element={<ProctorOnly><QuestionEditor /></ProctorOnly>} />
      <Route path="/questions/import"       element={<ProctorOnly><QuestionImport /></ProctorOnly>} />
      <Route path="/questions/:id/edit"     element={<ProctorOnly><QuestionEditor /></ProctorOnly>} />
      <Route path="/questions/:id/history"  element={<ProctorOnly><QuestionHistory /></ProctorOnly>} />

      {/* Exam Papers + Schedules — proctor + admin only */}
      <Route path="/exams"                       element={<ProctorOnly><ExamsList /></ProctorOnly>} />
      <Route path="/exam-papers/new"             element={<ProctorOnly><ExamBuilder /></ProctorOnly>} />
      <Route path="/exam-papers/:id/edit"        element={<ProctorOnly><ExamBuilder /></ProctorOnly>} />
      <Route path="/exam-schedules/new"          element={<ProctorOnly><ExamScheduler /></ProctorOnly>} />
      <Route path="/exam-schedules/:id/edit"     element={<ProctorOnly><ExamScheduler /></ProctorOnly>} />
      <Route path="/exams/:examId/results"                      element={<ProctorOnly><ExamResults /></ProctorOnly>} />
      <Route path="/exams/:examId/violations/:studentId"        element={<ProctorOnly><ViolationReview /></ProctorOnly>} />
      <Route path="/exams/:examId/grade/:studentId"            element={<ProctorOnly><GradeSubmission /></ProctorOnly>} />

      {/* Live Monitor — proctor + admin only */}
      <Route path="/monitor/:examId" element={<ProctorOnly><LiveMonitor /></ProctorOnly>} />

      {/* Admin — user management */}
      <Route path="/admin/users" element={<AdminOnly><UserManagement /></AdminOnly>} />

      {/* Live Monitor List */}
      <Route path="/monitor" element={<ProctorOnly><MonitorList /></ProctorOnly>} />

      {/* Student Exam Session */}
      <Route path="/exam/:examId" element={<Protected><ExamSession /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
