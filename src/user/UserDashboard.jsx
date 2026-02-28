import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './UserDashboard.css';

import TopNav from './components/TopNav';
import TabNav from './components/TabNav';

import Home from './pages/Home';
import Analyze from './pages/Analyze';
import History from './pages/History';
import FamilyGuardian from './pages/FamilyGuardian';
import Learn from './pages/Learn';

const UserDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const activeTab = location.pathname.split('/')[2] || 'home';

    const handleTabChange = (id) => {
        navigate(`/user/${id}`);
    };

    return (
        <div className="user-dashboard">
            <TopNav />

            <div className="user-main">
                <Routes>
                    <Route path="/" element={<Navigate to="home" replace />} />
                    <Route path="home" element={<Home />} />
                    <Route path="analyze" element={<Analyze />} />
                    <Route path="history" element={<History />} />
                    <Route path="family" element={<FamilyGuardian />} />
                    <Route path="learn" element={<Learn />} />
                </Routes>
            </div>

            <TabNav activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
    );
};

export default UserDashboard;
