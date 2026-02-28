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
        <div className="page active" id="page-home">
            {/* PANIC BUTTON */}
            <div className="panic-zone">
                <button className="panic-btn" onClick={triggerPanic}>
                    <div className="panic-icon">🚨</div>
                    <div className="panic-label">AM I BEING<br />SCAMMED?</div>
                </button>
                <div className="panic-title">Emergency Scam Detection</div>
                <div className="panic-sub">Tap if you're on a suspicious call right now</div>
            </div>

            {/* STATS */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-val" style={{ color: 'var(--green-u)' }}>12</div>
                    <div className="stat-lbl">SCANS DONE</div>
                </div>
                <div className="stat-card">
                    <div className="stat-val" style={{ color: 'var(--red-u)' }}>3</div>
                    <div className="stat-lbl">BLOCKED</div>
                </div>
                <div className="stat-card">
                    <div className="stat-val" style={{ color: 'var(--blue-u)' }}>₹2.4L</div>
                    <div className="stat-lbl">SAVED</div>
                </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="quick-grid">
                <div className="quick-btn" onClick={navigateToAnalyze}>
                    <div className="quick-icon">📞</div>
                    <div className="quick-label">Scan Call</div>
                </div>
                <div className="quick-btn" onClick={navigateToAnalyze}>
                    <div className="quick-icon">💬</div>
                    <div className="quick-label">Scan SMS</div>
                </div>
                <div className="quick-btn" onClick={navigateToAnalyze}>
                    <div className="quick-icon">🟢</div>
                    <div className="quick-label">Scan Chat</div>
                </div>
            </div>

            {/* ELDERLY MODE */}
            <div className="elderly-card">
                <div className="elderly-toggle-row">
                    <div>
                        <div className="elderly-title">👴 Elderly Mode</div>
                        <div className="elderly-sub">Larger text, voice warnings, simplified alerts</div>
                    </div>
                    <div
                        className={`u-toggle ${elderlyMode ? 'on' : ''}`}
                        onClick={() => setElderlyMode(!elderlyMode)}
                    ></div>
                </div>
            </div>

            {/* AWARENESS FEED */}
            <div className="user-card">
                <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>⚠️ Scams Near You</span>
                    <span style={{ fontSize: '11px', color: 'var(--blue-u)', cursor: 'pointer' }}>See all →</span>
                </div>
                <div className="u-feed-item">
                    <div className="u-feed-emoji">📞</div>
                    <div className="u-feed-content">
                        <div className="u-feed-title">Fake SBI "Account Blocked" Calls</div>
                        <div className="u-feed-desc">Scammers impersonating SBI helpline are calling Chennai users claiming their account is blocked and asking for OTP.</div>
                        <span className="u-feed-tag red">HIGH ALERT · CHENNAI</span>
                    </div>
                </div>
                <div className="u-feed-item">
                    <div className="u-feed-emoji">💼</div>
                    <div className="u-feed-content">
                        <div className="u-feed-title">WhatsApp Work-From-Home Scam</div>
                        <div className="u-feed-desc">"Like YouTube videos for ₹500/hour" — once you pay a registration fee, they disappear.</div>
                        <span className="u-feed-tag orange">TRENDING · TAMIL NADU</span>
                    </div>
                </div>
                <div className="u-feed-item">
                    <div className="u-feed-emoji">🏆</div>
                    <div className="u-feed-content">
                        <div className="u-feed-title">KBC Lottery Fraud SMS</div>
                        <div className="u-feed-desc">Fake SMS claiming you've won ₹25 lakh in KBC lottery and asking for processing fee.</div>
                        <span className="u-feed-tag yellow">MODERATE · NATIONWIDE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
