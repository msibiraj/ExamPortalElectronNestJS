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

/**
 * For admin users: requires the user to hold at least one of the listed permissions.
 * Proctors and students pass through — their access is governed by ProctorOnly/AdminOnly above.
 * Admin with permissions === null (super admin) also passes through.
 */
function WithPermission({ children, anyOf }) {
  const { user, hasAnyPermission } = useAuth();
  if (user?.role !== 'admin') return children;
  if (hasAnyPermission(...anyOf)) return children;
  return <Navigate to="/unauthorized" replace />;
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

      {/* Question Bank — proctor always; admin needs manage_questions */}
      <Route path="/questions"             element={<ProctorOnly><WithPermission anyOf={['manage_questions']}><QuestionBank /></WithPermission></ProctorOnly>} />
      <Route path="/questions/new"         element={<ProctorOnly><WithPermission anyOf={['manage_questions']}><QuestionEditor /></WithPermission></ProctorOnly>} />
      <Route path="/questions/import"      element={<ProctorOnly><WithPermission anyOf={['manage_questions']}><QuestionImport /></WithPermission></ProctorOnly>} />
      <Route path="/questions/:id/edit"    element={<ProctorOnly><WithPermission anyOf={['manage_questions']}><QuestionEditor /></WithPermission></ProctorOnly>} />
      <Route path="/questions/:id/history" element={<ProctorOnly><WithPermission anyOf={['manage_questions']}><QuestionHistory /></WithPermission></ProctorOnly>} />

      {/* Exam Papers & Schedules — proctor always; admin needs manage_exams */}
      <Route path="/exam-papers/new"         element={<ProctorOnly><WithPermission anyOf={['manage_exams']}><ExamBuilder /></WithPermission></ProctorOnly>} />
      <Route path="/exam-papers/:id/edit"    element={<ProctorOnly><WithPermission anyOf={['manage_exams']}><ExamBuilder /></WithPermission></ProctorOnly>} />
      <Route path="/exam-schedules/new"      element={<ProctorOnly><WithPermission anyOf={['manage_exams']}><ExamScheduler /></WithPermission></ProctorOnly>} />
      <Route path="/exam-schedules/:id/edit" element={<ProctorOnly><WithPermission anyOf={['manage_exams']}><ExamScheduler /></WithPermission></ProctorOnly>} />

      {/* Exams list — admin needs manage_exams OR view_reports */}
      <Route path="/exams" element={<ProctorOnly><WithPermission anyOf={['manage_exams', 'view_reports']}><ExamsList /></WithPermission></ProctorOnly>} />

      {/* Results & violations — admin needs view_reports */}
      <Route path="/exams/:examId/results"               element={<ProctorOnly><WithPermission anyOf={['view_reports']}><ExamResults /></WithPermission></ProctorOnly>} />
      <Route path="/exams/:examId/violations/:studentId" element={<ProctorOnly><WithPermission anyOf={['view_reports']}><ViolationReview /></WithPermission></ProctorOnly>} />

      {/* Grading — admin needs manage_exams */}
      <Route path="/exams/:examId/grade/:studentId" element={<ProctorOnly><WithPermission anyOf={['manage_exams']}><GradeSubmission /></WithPermission></ProctorOnly>} />

      {/* Live Monitor — admin needs manage_proctoring */}
      <Route path="/monitor"      element={<ProctorOnly><WithPermission anyOf={['manage_proctoring']}><MonitorList /></WithPermission></ProctorOnly>} />
      <Route path="/monitor/:examId" element={<ProctorOnly><WithPermission anyOf={['manage_proctoring']}><LiveMonitor /></WithPermission></ProctorOnly>} />

      {/* User Management — admin needs manage_users */}
      <Route path="/admin/users" element={<AdminOnly><WithPermission anyOf={['manage_users']}><UserManagement /></WithPermission></AdminOnly>} />

      {/* Student Exam Session */}
      <Route path="/exam/:examId" element={<Protected><ExamSession /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
