import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import PoliceDashboard from './police/PoliceDashboard';
import UserDashboard from './user/UserDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/police" replace />} />
        <Route path="/police/*" element={<PoliceDashboard />} />
        <Route path="/user/*" element={<UserDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
