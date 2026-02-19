import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const PROCTOR_NAV = [
  {
    label: 'Question Bank',
    description: 'Create and manage MCQ, Descriptive, and Programming questions.',
    path: '/questions',
    color: 'indigo',
    icon: '📝',
    action: '+ Add Question',
  },
  {
    label: 'Exam Papers',
    description: 'Build exam papers with multiple sections and all question types.',
    path: '/exam-papers/new',
    color: 'violet',
    icon: '📄',
    action: '+ New Paper',
  },
  {
    label: 'Exams',
    description: 'Schedule exams, enrol students, activate and monitor live.',
    path: '/exams',
    color: 'blue',
    icon: '📅',
    action: '+ Schedule Exam',
  },
  {
    label: 'Live Monitor',
    description: 'Watch live candidate feeds and handle violations during exams.',
    path: '/monitor',
    color: 'green',
    icon: '👁️',
    action: 'Open Monitor',
    comingSoon: true,
  },
  {
    label: 'Results',
    description: 'Grade descriptive answers, review item analysis, and publish results.',
    path: '/results',
    color: 'amber',
    icon: '📊',
    action: 'View Results',
    comingSoon: true,
  },
];

const ADMIN_EXTRA = [
  {
    label: 'User Management',
    description: 'Create and manage proctor and student accounts, assign roles.',
    path: '/admin/users',
    color: 'rose',
    icon: '👥',
    action: '+ Add User',
    adminOnly: true,
  },
];

const COLOR_MAP = {
  indigo: { card: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200', label: 'text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white', icon: 'bg-indigo-100 text-indigo-600' },
  violet: { card: 'bg-violet-50 hover:bg-violet-100 border-violet-200', label: 'text-violet-700', btn: 'bg-violet-600 hover:bg-violet-700 text-white', icon: 'bg-violet-100 text-violet-600' },
  blue:   { card: 'bg-blue-50 hover:bg-blue-100 border-blue-200',       label: 'text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700 text-white',   icon: 'bg-blue-100 text-blue-600'   },
  green:  { card: 'bg-green-50 hover:bg-green-100 border-green-200',    label: 'text-green-700',  btn: 'bg-green-600 hover:bg-green-700 text-white',  icon: 'bg-green-100 text-green-600' },
  amber:  { card: 'bg-amber-50 hover:bg-amber-100 border-amber-200',    label: 'text-amber-700',  btn: 'bg-amber-600 hover:bg-amber-700 text-white',  icon: 'bg-amber-100 text-amber-600' },
  rose:   { card: 'bg-rose-50 hover:bg-rose-100 border-rose-200',       label: 'text-rose-700',   btn: 'bg-rose-600 hover:bg-rose-700 text-white',    icon: 'bg-rose-100 text-rose-600'   },
};

const ROLE_BADGE = {
  admin:   'bg-rose-100 text-rose-700',
  proctor: 'bg-indigo-100 text-indigo-700',
  student: 'bg-green-100 text-green-700',
};

function NavCard({ item, navigate }) {
  const c = COLOR_MAP[item.color];
  return (
    <div
      className={`relative rounded-xl border p-5 transition-colors ${c.card} ${item.comingSoon ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
      onClick={() => !item.comingSoon && navigate(item.path)}
    >
      {item.comingSoon && (
        <span className="absolute top-3 right-3 rounded-full bg-gray-200 text-gray-500 text-xs px-2 py-0.5">
          Coming soon
        </span>
      )}
      {item.adminOnly && (
        <span className="absolute top-3 right-3 rounded-full bg-rose-100 text-rose-600 text-xs px-2 py-0.5">
          Admin only
        </span>
      )}
      <div className={`mb-3 inline-flex rounded-lg p-2 text-xl ${c.icon}`}>{item.icon}</div>
      <h3 className={`font-semibold text-base ${c.label}`}>{item.label}</h3>
      <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.description}</p>
      {!item.comingSoon && (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(item.path); }}
          className={`mt-4 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${c.btn}`}
        >
          {item.action}
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? [...PROCTOR_NAV, ...ADMIN_EXTRA] : PROCTOR_NAV;
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">ProctorPlatform</h1>
              <p className="text-xs text-gray-400">{isAdmin ? 'Admin Console' : 'Proctor Home'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${ROLE_BADGE[user?.role] ?? 'bg-gray-100 text-gray-600'}`}>
                {roleLabel}
              </span>
            </div>
            <button
              onClick={logout}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Welcome back, {user?.name}
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          Select a section below to get started.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {navItems.map((item) => (
            <NavCard key={item.path} item={item} navigate={navigate} />
          ))}
        </div>

        <div className="mt-10 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">End-to-End Workflow</h3>
          <ol className="space-y-2">
            {[
              { step: '1', label: 'Build Question Bank', desc: 'Create and publish all questions you want to use.' },
              { step: '2', label: 'Build Template', desc: 'Define exam structure: sections, rules, marks, randomisation.' },
              { step: '3', label: 'Schedule Exam', desc: 'Create the exam event, set the time window, enrol candidates.' },
              { step: '4', label: 'Monitor & Close', desc: 'Watch live feeds, handle violations, close exam, review results.' },
            ].map((s) => (
              <li key={s.step} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                  {s.step}
                </span>
                <div>
                  <span className="text-sm font-medium text-gray-800">{s.label}</span>
                  <span className="text-sm text-gray-400"> — {s.desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
