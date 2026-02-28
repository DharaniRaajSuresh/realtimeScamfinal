import React from 'react';

const Sidebar = ({ activeTab, onTabChange }) => {
    return (
        <div className="sidebar">
            <div className="sidebar-section">
                <div className="sidebar-label">LIVE STATUS</div>
                <div
                    className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => onTabChange('overview')}
                >
                    <span className="s-icon">⬡</span> Command View
                </div>
                <div
                    className={`sidebar-item ${activeTab === 'heatmap' ? 'active' : ''}`}
                    onClick={() => onTabChange('heatmap')}
                >
                    <span className="s-icon">◈</span> Scam Heatmap
                </div>
                <div className="sidebar-item">
                    <span className="s-icon">📡</span> Live Intercepts <span className="s-badge">3</span>
                </div>
            </div>
            <div className="sidebar-section">
                <div className="sidebar-label">INTELLIGENCE</div>
                <div
                    className={`sidebar-item ${activeTab === 'fingerprint' ? 'active' : ''}`}
                    onClick={() => onTabChange('fingerprint')}
                >
                    <span className="s-icon">🧬</span> DNA Fingerprint
                </div>
                <div
                    className={`sidebar-item ${activeTab === 'voiceprint' ? 'active' : ''}`}
                    onClick={() => onTabChange('voiceprint')}
                >
                    <span className="s-icon">🔊</span> Voiceprint Lib
                </div>
                <div className="sidebar-item">
                    <span className="s-icon">🗃️</span> Scam Scripts DB
                </div>
            </div>
            <div className="sidebar-section">
                <div className="sidebar-label">OPERATIONS</div>
                <div
                    className={`sidebar-item ${activeTab === 'cases' ? 'active' : ''}`}
                    onClick={() => onTabChange('cases')}
                >
                    <span className="s-icon">📁</span> Case Tracker <span className="s-badge">12</span>
                </div>
                <div className="sidebar-item">
                    <span className="s-icon">👤</span> Suspect Profiles
                </div>
                <div className="sidebar-item">
                    <span className="s-icon">🚨</span> Golden Alerts <span className="s-badge">2</span>
                </div>
            </div>
            <div className="sidebar-section">
                <div className="sidebar-label">REPORTS</div>
                <div
                    className={`sidebar-item ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => onTabChange('reports')}
                >
                    <span className="s-icon">📊</span> Analytics
                </div>
                <div className="sidebar-item">
                    <span className="s-icon">📄</span> Autopsy Reports
                </div>
                <div className="sidebar-item">
                    <span className="s-icon">📤</span> Export Data
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
