import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './PoliceDashboard.css';

import Topbar from './components/Topbar';
import NavTabs from './components/NavTabs';
import Sidebar from './components/Sidebar';

import Overview from './pages/Overview';
import Heatmap from './pages/Heatmap';
import Fingerprint from './pages/Fingerprint';
import Voiceprint from './pages/Voiceprint';
import CaseTracker from './pages/CaseTracker';
import Reports from './pages/Reports';

const PoliceDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const activeTab = location.pathname.split('/')[2] || 'overview';

    const handlePageChange = (id) => {
        navigate(`/police/${id}`);
    };

    return (
        <div className="police-dashboard">
            <Topbar />
            <NavTabs activeTab={activeTab} onTabChange={handlePageChange} />

            <div className="main">
                <Sidebar activeTab={activeTab} onTabChange={handlePageChange} />
                <div className="content">
                    <Routes>
                        <Route path="/" element={<Navigate to="overview" replace />} />
                        <Route path="overview" element={<Overview />} />
                        <Route path="heatmap" element={<Heatmap />} />
                        <Route path="fingerprint" element={<Fingerprint />} />
                        <Route path="voiceprint" element={<Voiceprint />} />
                        <Route path="cases" element={<CaseTracker />} />
                        <Route path="reports" element={<Reports />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

export default PoliceDashboard;
