import React, { useState, useEffect } from 'react';

const Topbar = () => {
    const [time, setTime] = useState(new Date().toLocaleTimeString('en-IN', { hour12: false }));

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="topbar">
            <div className="topbar-left">
                <div className="logo-badge">
                    <span className="logo-icon">🛡️</span>
                    <div>
                        <div className="logo-text">AI SCAM SHIELD</div>
                        <div className="logo-sub">CYBER CRIME COMMAND CENTER</div>
                    </div>
                </div>
                <div className="threat-level">
                    <div className="threat-dot"></div>
                    <span className="threat-text">THREAT LEVEL: ELEVATED</span>
                </div>
            </div>
            <div className="topbar-right">
                <div>
                    <div className="sys-clock" id="clock">{time}</div>
                    <div className="officer-badge">UNIT: CYBER CELL CHENNAI</div>
                </div>
                <div className="officer-badge" style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--cyan)', fontSize: '12px', fontWeight: 600 }}>Insp. K. Rajan</div>
                    <div>CLEARANCE: L3</div>
                </div>
            </div>
        </div>
    );
};

export default Topbar;
