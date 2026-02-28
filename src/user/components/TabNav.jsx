import React from 'react';

const TabNav = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'home', icon: '🏠', label: 'Home' },
        { id: 'analyze', icon: '🔍', label: 'Analyze' },
        { id: 'history', icon: '📋', label: 'History' },
        { id: 'family', icon: '👨‍👩‍👧', label: 'Family' },
        { id: 'learn', icon: '📚', label: 'Learn' },
    ];

    return (
        <div className="tab-nav">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    <div className="t-icon">{tab.icon}</div>
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default TabNav;
