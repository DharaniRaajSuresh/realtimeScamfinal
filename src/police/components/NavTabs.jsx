import React from 'react';

const NavTabs = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'overview', label: '▶ OVERVIEW' },
        { id: 'heatmap', label: '◈ LIVE HEATMAP' },
        { id: 'fingerprint', label: '⬡ SCAM DNA' },
        { id: 'voiceprint', label: '◎ VOICEPRINT LIB' },
        { id: 'cases', label: '☰ CASE TRACKER' },
        { id: 'reports', label: '↗ REPORTS' },
    ];

    return (
        <div className="nav-tabs">
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.label}
                </div>
            ))}
        </div>
    );
};

export default NavTabs;
