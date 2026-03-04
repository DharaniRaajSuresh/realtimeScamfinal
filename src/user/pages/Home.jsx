import React, { useState, useEffect } from 'react';
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

    const [feedData, setFeedData] = useState([]);
    const [loadingFeed, setLoadingFeed] = useState(true);

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                // Resolve backend URL
                const baseUrl = import.meta.env.VITE_BACKEND_URL
                    ? import.meta.env.VITE_BACKEND_URL.replace('ws://', 'http://').replace('wss://', 'https://')
                    : '';
                const res = await fetch(`${baseUrl}/api/feed`);
                const data = await res.json();
                setFeedData(data);
            } catch (err) {
                console.error("Failed to load Gemini scam feed:", err);
                setFeedData([{ title: "Connection Error", description: "Failed to load live scam trends.", severity: "CRITICAL", emoji: "❌" }]);
            } finally {
                setLoadingFeed(false);
            }
        };
        fetchFeed();
    }, []);

    const getSeverityColor = (sev) => {
        const s = sev?.toUpperCase() || "";
        if (s.includes("CRITICAL") || s.includes("HIGH")) return "red";
        if (s.includes("TRENDING") || s.includes("NEW")) return "orange";
        return "blue";
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
            </div>

            <div className="section-label">Live Awareness Feed</div>
            <div className="list-group">
                {loadingFeed ? (
                    <div className="list-item" style={{ justifyContent: 'center', padding: '24px' }}>
                        <div style={{ color: 'var(--muted-u)', fontSize: '14px', animation: 'bgPulse 1.5s infinite alternate' }}>
                            Fetching latest trends from Gemini...
                        </div>
                    </div>
                ) : (
                    feedData.map((item, idx) => {
                        const colorClass = getSeverityColor(item.severity);
                        return (
                            <div key={idx} className="list-item" style={{ alignItems: 'flex-start' }}>
                                <div className="li-icon" style={{ background: `var(--${colorClass}-u)` }}>
                                    {item.emoji || '🚨'}
                                </div>
                                <div className="li-content">
                                    <div className="li-title">{item.title}</div>
                                    <div className="li-sub" style={{ marginTop: '4px', lineHeight: 1.4 }}>
                                        {item.description}
                                    </div>
                                    <span className={`u-feed-tag ${colorClass}`} style={{ marginTop: '8px', alignSelf: 'flex-start' }}>
                                        {item.severity}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Home;
