import React, { useState, useEffect, useRef } from 'react';

const Fingerprint = () => {
    const [activeCase, setActiveCase] = useState(0);
    const canvasRef = useRef(null);

    const dnaConfigs = [
        { label: 'Banking Fraud #4821', vals: [0.95, 0.8, 0.7, 0.9, 0.6, 0.85] },
        { label: 'Investment #4809', vals: [0.4, 0.9, 0.8, 0.5, 0.95, 0.7] },
        { label: 'KYC Phishing #4798', vals: [0.7, 0.6, 0.9, 0.8, 0.5, 0.65] },
    ];
    const dnaLabels = ['URGENCY', 'AUTHORITY', 'FEAR', 'OTP REQ', 'IMPERSONATION', 'LINK PHISHING'];
    const dnaColors = ['#FF3040', '#FF8C00', '#FFD600', '#00FF9D', '#00C8FF', '#FF3040'];

    useEffect(() => {
        const cfg = dnaConfigs[activeCase];
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cx = 140, cy = 140, r = 110;
        ctx.clearRect(0, 0, 280, 280);
        const n = 6;
        // Draw grid
        for (let ring = 1; ring <= 4; ring++) {
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
                const a = i * (2 * Math.PI / n) - Math.PI / 2;
                const x = cx + r * (ring / 4) * Math.cos(a);
                const y = cy + r * (ring / 4) * Math.sin(a);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = 'rgba(0,200,255,0.1)';
            ctx.stroke();
        }
        // Axes
        for (let i = 0; i < n; i++) {
            const a = i * (2 * Math.PI / n) - Math.PI / 2;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
            ctx.strokeStyle = 'rgba(0,200,255,0.15)'; ctx.stroke();
            ctx.fillStyle = 'rgba(200,232,240,0.7)';
            ctx.font = "bold 9px 'Share Tech Mono', monospace";
            ctx.textAlign = 'center';
            const lx = cx + (r + 18) * Math.cos(a), ly = cy + (r + 18) * Math.sin(a);
            ctx.fillText(dnaLabels[i], lx, ly + 3);
        }
        // Data polygon
        ctx.beginPath();
        cfg.vals.forEach((v, i) => {
            const a = i * (2 * Math.PI / n) - Math.PI / 2;
            const x = cx + r * v * Math.cos(a), y = cy + r * v * Math.sin(a);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,48,64,0.15)'; ctx.fill();
        ctx.strokeStyle = 'var(--red)'; ctx.lineWidth = 2; ctx.stroke();
        // Points
        cfg.vals.forEach((v, i) => {
            const a = i * (2 * Math.PI / n) - Math.PI / 2;
            ctx.beginPath(); ctx.arc(cx + r * v * Math.cos(a), cy + r * v * Math.sin(a), 4, 0, Math.PI * 2);
            ctx.fillStyle = dnaColors[i]; ctx.fill();
        });
    }, [activeCase]);

    return (
        <div className="page active" id="page-fingerprint">
            <div className="panel" style={{ marginBottom: '16px' }}>
                <div className="panel-head">
                    <div className="panel-title">SCAM DNA FINGERPRINT ANALYZER</div>
                    <div className="panel-tag">SELECT CASE TO ANALYZE</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <button className={`btn-action ${activeCase === 0 ? 'active' : ''}`} onClick={() => setActiveCase(0)}>Case #4821 — Banking</button>
                    <button className={`btn-action ${activeCase === 1 ? 'active' : ''}`} onClick={() => setActiveCase(1)}>Case #4809 — Investment</button>
                    <button className={`btn-action ${activeCase === 2 ? 'active' : ''}`} onClick={() => setActiveCase(2)}>Case #4798 — KYC</button>
                </div>
                <div className="grid-2">
                    <div>
                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--cyan)', letterSpacing: '2px', marginBottom: '12px' }}>// TACTIC DISTRIBUTION RADAR</div>
                        <canvas ref={canvasRef} width="280" height="280" style={{ display: 'block', margin: '0 auto' }}></canvas>
                    </div>
                    <div>
                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--cyan)', letterSpacing: '2px', marginBottom: '12px' }}>// DNA BREAKDOWN</div>
                        <div>
                            {dnaConfigs[activeCase].vals.map((v, i) => (
                                <div key={i} style={{ marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                                        <span>{dnaLabels[i]}</span>
                                        <span style={{ fontFamily: "'Share Tech Mono', monospace", color: dnaColors[i] }}>{Math.round(v * 100)}%</span>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', height: '4px' }}>
                                        <div style={{ width: `${v * 100}%`, height: '100%', background: dnaColors[i], transition: 'width .6s' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(0,200,255,0.04)', border: '1px solid var(--border)' }}>
                            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '8px' }}>// SIMILARITY MATCH</div>
                            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>87% match with Script #SCP-Banking-023</div>
                            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>Used in 34 previous cases — Chennai region — Active since March 2024</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Fingerprint;
