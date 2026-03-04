import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    const [elderlyMode, setElderlyMode] = useState(false);

    const triggerPanic = () => {
        navigate('/user/analyze', { state: { startMic: true } });
    };

    const navigateToAnalyze = () => {
        navigate('/user/analyze');
    };

    return (
        <div className="page active" id="page-home" style={{ paddingTop: '10px' }}>
            <div className="contact-header">
                <div className="contact-avatar-large">
                    <div className="avatar-initials">S</div>
                </div>
                <h1 className="contact-name-large">Scam Shield ❤️</h1>
                <div className="contact-sub-large">Active Monitoring</div>
            </div>

            <div className="contact-actions-row">
                <button className="contact-action-btn" onClick={triggerPanic}>
                    <span className="contact-action-icon" style={{ color: 'var(--red-u)' }}>🚨</span>
                    <span className="contact-action-label" style={{ color: 'var(--red-u)' }}>panic</span>
                </button>
                <button className="contact-action-btn" onClick={navigateToAnalyze}>
                    <span className="contact-action-icon">📞</span>
                    <span className="contact-action-label">audio</span>
                </button>
                <button className="contact-action-btn" onClick={navigateToAnalyze}>
                    <span className="contact-action-icon">💬</span>
                    <span className="contact-action-label">message</span>
                </button>
                <button className="contact-action-btn" onClick={() => setElderlyMode(!elderlyMode)}>
                    <span className="contact-action-icon">{elderlyMode ? '👴🏼' : '👴'}</span>
                    <span className="contact-action-label">elderly</span>
                </button>
            </div>

            <div className="list-group">
                <div className="list-item">
                    <div className="li-icon" style={{ background: 'var(--green-u)' }}>🛡️</div>
                    <div className="li-content">
                        <div className="li-title">Protection Status</div>
                    </div>
                    <div className="li-right">Active 〉</div>
                </div>
                <div className="list-item">
                    <div className="li-icon" style={{ background: 'var(--blue-u)' }}>📊</div>
                    <div className="li-content">
                        <div className="li-title">Threat Scans</div>
                    </div>
                    <div className="li-right">12 〉</div>
                </div>
                <div className="list-item">
                    <div className="li-icon" style={{ background: 'var(--red-u)' }}>⛔</div>
                    <div className="li-content">
                        <div className="li-title">Blocked Scams</div>
                    </div>
                    <div className="li-right">3 〉</div>
                </div>
                <div className="list-item">
                    <div className="li-icon" style={{ background: 'var(--orange-u)' }}>💰</div>
                    <div className="li-content">
                        <div className="li-title">Money Saved</div>
                    </div>
                    <div className="li-right">₹2.4L 〉</div>
                </div>
            </div>

            <div className="section-label">Awareness Feed</div>
            <div className="list-group">
                <div className="list-item" style={{ alignItems: 'flex-start' }}>
                    <div className="li-icon" style={{ background: 'var(--red-u)' }}>📞</div>
                    <div className="li-content">
                        <div className="li-title">Fake "Account Blocked" Calls</div>
                        <div className="li-sub" style={{ marginTop: '4px', lineHeight: 1.4 }}>Scammers impersonating bank helplines asking for OTP.</div>
                        <span className="u-feed-tag red" style={{ marginTop: '8px', alignSelf: 'flex-start' }}>HIGH ALERT</span>
                    </div>
                </div>
                <div className="list-item" style={{ alignItems: 'flex-start' }}>
                    <div className="li-icon" style={{ background: 'var(--orange-u)' }}>💼</div>
                    <div className="li-content">
                        <div className="li-title">WhatsApp Work-From-Home Scam</div>
                        <div className="li-sub" style={{ marginTop: '4px', lineHeight: 1.4 }}>"Like YouTube videos for ₹500/hr" registration fee scam.</div>
                        <span className="u-feed-tag orange" style={{ marginTop: '8px', alignSelf: 'flex-start' }}>TRENDING</span>
                    </div>
                </div>
                <div className="list-item" style={{ alignItems: 'flex-start' }}>
                    <div className="li-icon" style={{ background: 'var(--purple-u)' }}>🚨</div>
                    <div className="li-content">
                        <div className="li-title">Fake CBI "Digital Arrest"</div>
                        <div className="li-sub" style={{ marginTop: '4px', lineHeight: 1.4 }}>Video calls demanding money to clear fake money laundering charges.</div>
                        <span className="u-feed-tag red" style={{ marginTop: '8px', alignSelf: 'flex-start' }}>CRITICAL</span>
                    </div>
                </div>
                <div className="list-item" style={{ alignItems: 'flex-start' }}>
                    <div className="li-icon" style={{ background: 'var(--yellow-u)' }}>⚡</div>
                    <div className="li-content">
                        <div className="li-title">Electricity Disconnection SMS</div>
                        <div className="li-sub" style={{ marginTop: '4px', lineHeight: 1.4 }}>Warnings that power will be cut tonight unless you click a link.</div>
                        <span className="u-feed-tag orange" style={{ marginTop: '8px', alignSelf: 'flex-start' }}>NEW</span>
                    </div>
                </div>
                <div className="list-item" style={{ alignItems: 'flex-start' }}>
                    <div className="li-icon" style={{ background: 'var(--blue-u)' }}>📦</div>
                    <div className="li-content">
                        <div className="li-title">India Post Delivery Scam</div>
                        <div className="li-sub" style={{ marginTop: '4px', lineHeight: 1.4 }}>SMS asking for a ₹5 redirect fee via a fake India Post tracking link.</div>
                        <span className="u-feed-tag blue" style={{ marginTop: '8px', alignSelf: 'flex-start' }}>COMMON</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
