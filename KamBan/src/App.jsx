import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import CompanyDetail from './pages/CompanyDetail';
import Notes from './pages/Notes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="kanban" element={<Kanban />} />
          <Route path="notas" element={<Notes />} />
          <Route path="dashboard/:companyId" element={<CompanyDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;