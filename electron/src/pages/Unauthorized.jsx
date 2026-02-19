import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50 gap-4">
      <div className="text-5xl">403</div>
      <h1 className="text-xl font-bold text-gray-800">Access Denied</h1>
      <p className="text-sm text-gray-500">
        Your role (<strong>{user?.role ?? 'unknown'}</strong>) does not have permission to view this page.
      </p>
      <button
        onClick={() => navigate('/')}
        className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        Back to Home
      </button>
    </div>
  );
}
