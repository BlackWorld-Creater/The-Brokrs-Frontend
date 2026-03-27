import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import AppLayout from './components/layout/AppLayout'
import CustomerSupportChat from './components/ui/CustomerSupportChat'

/* ── Lazy Loaded Pages ────────────────────────────────────────── */
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'))
const RolesPage = lazy(() => import('./pages/RolesPage'))
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'))
const VerticalsPage = lazy(() => import('./pages/VerticalsPage'))
const CompanyPage = lazy(() => import('./pages/CompanyPage'))
const SitesPage = lazy(() => import('./pages/SitesPage'))
const WebServicesPage = lazy(() => import('./pages/WebServicesPage'))
const ModulesPage = lazy(() => import('./pages/ModulesPage'))
const IPTrackingPage = lazy(() => import('./pages/IPTrackingPage'))
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const HRPage = lazy(() => import('./pages/HRPage'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const LeavePage = lazy(() => import('./pages/LeavePage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const UserDashboardPage = lazy(() => import('./pages/UserDashboardPage'))
const EmailSettingsPage = lazy(() => import('./pages/EmailSettingsPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

/* ── Helper Component for Suspense ───────────────────────────── */
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-900">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent shadow-lg shadow-primary-500/20"></div>
  </div>
)

/* ── Smart home redirect ─────────────────────────────────────────── */
function HomeRedirect() {
  const { canAccess } = useAuthStore()
  return <Navigate to={canAccess('dashboard') ? '/dashboard' : '/my-dashboard'} replace />
}

/* ── Protected route ─────────────────────────────────────────────── */
function ProtectedRoute({ children, module }) {
  const { isAuthenticated, canAccess } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (module && !canAccess(module)) return <HomeRedirect />
  return children
}

export default function App() {
  const { isAuthenticated, canAccess } = useAuthStore()

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Login: if already logged in, go to smart home */}
          <Route path="/login"
            element={isAuthenticated
              ? <Navigate to={canAccess('dashboard') ? '/dashboard' : '/my-dashboard'} replace />
              : <LoginPage />
            }
          />

          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            {/* Root → smart redirect based on role */}
            <Route index element={<HomeRedirect />} />

            {/* ── Overview ─────────────────────────────────────────── */}
            <Route path="dashboard"
              element={
                <ProtectedRoute module="dashboard">
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="my-dashboard"
              element={
                <ProtectedRoute module="my-dashboard">
                  <UserDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* ── Organization ─────────────────────────────────────── */}
            <Route path="company" element={<ProtectedRoute module="company"><CompanyPage /></ProtectedRoute>} />
            <Route path="sites" element={<ProtectedRoute module="sites"><SitesPage /></ProtectedRoute>} />
            <Route path="departments" element={<ProtectedRoute module="departments"><DepartmentsPage /></ProtectedRoute>} />
            <Route path="verticals" element={<ProtectedRoute module="verticals"><VerticalsPage /></ProtectedRoute>} />

            {/* ── People ───────────────────────────────────────────── */}
            <Route path="users" element={<ProtectedRoute module="users"><UsersPage /></ProtectedRoute>} />
            <Route path="users/:id" element={<ProtectedRoute module="users"><UserDetailPage /></ProtectedRoute>} />
            <Route path="roles" element={<ProtectedRoute module="roles"><RolesPage /></ProtectedRoute>} />

            {/* ── HR ───────────────────────────────────────────────── */}
            <Route path="hr" element={<ProtectedRoute module="hr"><HRPage /></ProtectedRoute>} />
            <Route path="attendance" element={<ProtectedRoute module="attendance"><AttendancePage /></ProtectedRoute>} />
            <Route path="leave" element={<ProtectedRoute module="leave"><LeavePage /></ProtectedRoute>} />

            {/* ── Work ─────────────────────────────────────────────── */}
            <Route path="projects" element={<ProtectedRoute module="projects"><ProjectsPage /></ProtectedRoute>} />
            <Route path="tasks" element={<ProtectedRoute module="tasks"><TasksPage /></ProtectedRoute>} />

            {/* ── Analytics ────────────────────────────────────────── */}
            <Route path="reports" element={<ProtectedRoute module="reports"><ReportsPage /></ProtectedRoute>} />

            {/* ── System ───────────────────────────────────────────── */}
            <Route path="web-services" element={<ProtectedRoute module="web-services"><WebServicesPage /></ProtectedRoute>} />
            <Route path="modules" element={<ProtectedRoute module="modules"><ModulesPage /></ProtectedRoute>} />
            <Route path="ip-tracking" element={<ProtectedRoute module="audit"><IPTrackingPage /></ProtectedRoute>} />
            <Route path="audit-logs" element={<ProtectedRoute module="audit"><AuditLogsPage /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute module="settings"><SettingsPage /></ProtectedRoute>} />
            <Route path="email-settings" element={<ProtectedRoute module="settings"><EmailSettingsPage /></ProtectedRoute>} />

            {/* ── Profile — always accessible ──────────────────────── */}
            <Route path="chat" element={<ProtectedRoute module="chat"><ChatPage /></ProtectedRoute>} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <CustomerSupportChat />
    </BrowserRouter>
  )
}

