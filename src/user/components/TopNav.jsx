import React from 'react';

const TopNav = ({ isElderlyMode, toggleElderlyMode }) => {
    return (
        <div className="topnav">
            <div className="nav-brand">
                <div className="brand-icon">🛡️</div>
                <div>
                    <div className="brand-name">Scam Shield</div>
                    <div className="brand-tag">Your AI Protector</div>
                </div>
            </div>
            <div className="shield-status">
                <div className="shield-dot"></div>
                <span className="shield-label">PROTECTED</span>
            </div>
            <div className="nav-right">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted2-u)' }}>ELDERLY</span>
                    <div className={`u-toggle ${isElderlyMode ? 'on' : ''}`} onClick={toggleElderlyMode}></div>
                </div>
                <div className="notif-btn">🔔<div className="notif-dot"></div></div>
                <div className="avatar">SR</div>
            </div>
        </div>
    );
};

export default TopNav;
