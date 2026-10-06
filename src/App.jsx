import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Backlog from './pages/Backlog';
import BugBoard from './pages/BugBoard';
import TestCases from './pages/TestCases';
import Notes from './pages/Notes';
import MyBugs from './pages/MyBugs';
import Login from './pages/Login';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { homePathForRole } from './lib/domain';

/** El índice manda a cada rol a su pantalla de inicio (Dev → Mis bugs). */
function RoleIndex() {
  const { role } = useAuth();
  return <Navigate to={homePathForRole(role)} replace />;
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={(
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                )}
              >
                <Route index element={<RoleIndex />} />
                <Route
                  path="backlog"
                  element={(
                    <ProtectedRoute allow={['qa', 'viewer']}>
                      <Backlog />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="bugs"
                  element={(
                    <ProtectedRoute allow={['qa', 'viewer']}>
                      <BugBoard />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="casos-de-prueba"
                  element={(
                    <ProtectedRoute allow={['qa']}>
                      <TestCases />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="notes"
                  element={(
                    <ProtectedRoute allow={['qa']}>
                      <Notes />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="mis-bugs"
                  element={(
                    <ProtectedRoute allow={['dev']}>
                      <MyBugs />
                    </ProtectedRoute>
                  )}
                />
              </Route>
              {/* Cualquier ruta desconocida vuelve a la raíz; si no hay sesión,
                  ProtectedRoute la manda a /login. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
