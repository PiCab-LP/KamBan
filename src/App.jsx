import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Backlog from './pages/Backlog';
import BugBoard from './pages/BugBoard';
import TestCases from './pages/TestCases';
import Notes from './pages/Notes';
import Login from './pages/Login';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/backlog" replace />} />
              <Route path="backlog" element={<Backlog />} />
              <Route path="bugs" element={<BugBoard />} />
              <Route path="casos-de-prueba" element={<TestCases />} />
              <Route path="notes" element={<Notes />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
