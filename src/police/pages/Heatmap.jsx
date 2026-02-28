import React from 'react';

const Heatmap = () => {
    const hourData = [{ v: 12, l: '6AM' }, { v: 28, l: '9AM' }, { v: 45, l: '12PM' }, { v: 38, l: '3PM' }, { v: 52, l: '6PM' }, { v: 34, l: '9PM' }, { v: 18, l: '12AM' }];
    const maxHour = Math.max(...hourData.map(d => d.v));

    return (
        <div className="page active" id="page-heatmap">
            <div className="grid-3">
                <div className="panel kpi"><div className="kpi-val red">Chennai</div><div className="kpi-label">HOTTEST ZONE</div></div>
                <div className="panel kpi"><div className="kpi-val cyan">347</div><div className="kpi-label">INCIDENTS TODAY IN TN</div></div>
                <div className="panel kpi"><div className="kpi-val orange">Banking</div><div className="kpi-label">TOP SCAM TYPE</div></div>
            </div>
            <div className="panel" style={{ marginBottom: '16px' }}>
                <div className="panel-head">
                    <div className="panel-title">SCAM ACTIVITY HEATMAP — TAMIL NADU</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-action">24H</button>
                        <button className="btn-action active">7D</button>
                        <button className="btn-action">30D</button>
                    </div>
                </div>
                <div style={{ background: 'rgba(0,200,255,0.03)', border: '1px solid var(--border)', padding: '20px', textAlign: 'center', position: 'relative', minHeight: '280px', overflow: 'hidden' }}>
                    {/* Simplified India/TN outline via SVG */}
                    <svg viewBox="0 0 400 350" style={{ width: '100%', maxHeight: '260px', opacity: 0.9 }}>
                        {/* TN rough outline */}
                        <path d="M150,20 L220,10 L280,40 L310,90 L320,150 L300,220 L270,280 L230,320 L200,340 L180,310 L160,260 L130,200 L110,140 L120,80 Z"
                            fill="rgba(0,200,255,0.05)" stroke="rgba(0,200,255,0.3)" strokeWidth="1" />
                        {/* Hotspots */}
                        <circle cx="220" cy="240" r="28" fill="rgba(255,48,64,0.35)" stroke="rgba(255,48,64,0.6)" strokeWidth="1">
                            <animate attributeName="r" values="24;32;24" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <text x="220" y="245" textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize="9" fill="white">CHENNAI</text>

                        <circle cx="190" cy="200" r="16" fill="rgba(255,140,0,0.3)" stroke="rgba(255,140,0,0.5)" strokeWidth="1" />
                        <text x="190" y="204" textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize="7" fill="white">VELLORE</text>

                        <circle cx="230" cy="290" r="14" fill="rgba(255,140,0,0.25)" stroke="rgba(255,140,0,0.4)" strokeWidth="1" />
                        <text x="230" y="294" textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize="7" fill="white">MADURAI</text>

                        <circle cx="165" cy="155" r="12" fill="rgba(255,214,0,0.2)" stroke="rgba(255,214,0,0.4)" strokeWidth="1" />
                        <text x="165" y="159" textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize="7" fill="white">SALEM</text>

                        <circle cx="270" cy="180" r="10" fill="rgba(255,214,0,0.2)" stroke="rgba(255,214,0,0.3)" strokeWidth="1" />
                        <text x="270" y="184" textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize="7" fill="white">TRICHY</text>

                        <circle cx="200" cy="130" r="8" fill="rgba(0,200,255,0.15)" stroke="rgba(0,200,255,0.3)" strokeWidth="1" />

                        <circle cx="245" cy="330" r="9" fill="rgba(0,255,157,0.15)" stroke="rgba(0,255,157,0.3)" strokeWidth="1" />
                        <text x="245" y="334" textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize="7" fill="white">KOVAI</text>
                    </svg>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }}></span>CRITICAL (50+)</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--orange)', display: 'inline-block' }}></span>HIGH (20-50)</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--yellow)', display: 'inline-block' }}></span>MEDIUM</div>
                    </div>
                </div>
            </div>
            <div className="grid-2">
                <div className="panel">
                    <div className="panel-head"><div className="panel-title">SCAM VOLUME BY HOUR</div></div>
                    <div className="bar-chart">
                        {hourData.map((d, i) => (
                            <div key={i} className="bar-wrap">
                                <div className="bar-val">{d.v}</div>
                                <div className="bar red-bar" style={{ height: `${(d.v / maxHour) * 80}px` }}></div>
                                <div className="bar-lbl">{d.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="panel">
                    <div className="panel-head"><div className="panel-title">TOP TARGETED DISTRICTS</div></div>
                    <table className="data-table">
                        <thead><tr><th>DISTRICT</th><th>INCIDENTS</th><th>TREND</th></tr></thead>
                        <tbody>
                            <tr><td>Chennai</td><td style={{ color: 'var(--red)', fontFamily: "'Share Tech Mono', monospace" }}>127</td><td style={{ color: 'var(--red)' }}>▲ 34%</td></tr>
                            <tr><td>Coimbatore</td><td style={{ fontFamily: "'Share Tech Mono', monospace" }}>84</td><td style={{ color: 'var(--orange)' }}>▲ 12%</td></tr>
                            <tr><td>Madurai</td><td style={{ fontFamily: "'Share Tech Mono', monospace" }}>71</td><td style={{ color: 'var(--orange)' }}>▲ 8%</td></tr>
                            <tr><td>Salem</td><td style={{ fontFamily: "'Share Tech Mono', monospace" }}>45</td><td style={{ color: 'var(--green)' }}>▼ 5%</td></tr>
                            <tr><td>Trichy</td><td style={{ fontFamily: "'Share Tech Mono', monospace" }}>38</td><td style={{ color: 'var(--green)' }}>▼ 2%</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Heatmap;
