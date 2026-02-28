import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { useScamContext } from '../../context/ScamContext';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

const Overview = () => {
    // Global real-time context
    const { isCallActive, currentChannel, riskScore, scamTactics, vulnerability, transcriptHistory } = useScamContext();

    const initialFeed = [
        { sev: 'high', title: 'OTP Scam — Banking', meta: 'VICTIM #4821 · CHENNAI · CALL ACTIVE', score: '92%', cls: 'high' },
        { sev: 'high', title: 'KYC Phishing SMS', meta: 'VICTIM #4819 · COIMBATORE · DETECTED', score: '88%', cls: 'high' },
        { sev: 'med', title: 'WhatsApp Job Scam', meta: 'VICTIM #4817 · MADURAI · ANALYZING', score: '74%', cls: 'med' },
        { sev: 'med', title: 'Investment Fraud Call', meta: 'VICTIM #4815 · TRICHY · BLOCKED', score: '81%', cls: 'med' },
        { sev: 'low', title: 'Lottery SMS Detected', meta: 'VICTIM #4813 · SALEM · LOW RISK', score: '41%', cls: 'med' },
    ];

    const [feedData, setFeedData] = useState(initialFeed);

    // Dynamic feed generation from transcription
    useEffect(() => {
        if (!isCallActive) {
            // Revert back to simulated feed when no call
            const interval = setInterval(() => {
                setFeedData(prev => {
                    const newData = [...prev];
                    const last = newData.pop();
                    newData.unshift(last);
                    return newData;
                });
            }, 4000);
            return () => clearInterval(interval);
        }
    }, [isCallActive]);

    const typeData = [
        { v: 31, l: 'BANK' }, { v: 24, l: 'OTP' }, { v: 18, l: 'KYC' }, { v: 14, l: 'JOB' }, { v: 8, l: 'INV' }, { v: 5, l: 'OTH' }
    ];
    const maxType = Math.max(...typeData.map(d => d.v));

    // Radar Chart Data preparation
    const getRadarData = () => {
        let urg = 30, auth = 20, fin = 20, comp = 20, fear = 10;

        if (isCallActive) {
            urg = scamTactics.includes('Time Pressure / Urgency') ? 95 : 20;
            auth = scamTactics.includes('Authority Impersonation') ? 90 : 20;
            fin = (scamTactics.includes('Financial Requisition') || scamTactics.includes('Financial Disclosure')) ? 95 : 20;
            comp = scamTactics.includes('High Compliance') ? 85 : 30;
            fear = (urg > 80 && auth > 80) ? 80 : 20; // Derived stat
        }

        return {
            labels: ['Urgency', 'Authority', 'Financial', 'Compliance', 'Fear'],
            datasets: [
                {
                    label: 'Scam DNA Signature',
                    data: [urg, auth, fin, comp, fear],
                    borderColor: riskScore > 85 ? 'rgba(255, 48, 64, 1)' : 'rgba(0, 200, 255, 1)',
                    backgroundColor: riskScore > 85 ? 'rgba(255, 48, 64, 0.2)' : 'rgba(0, 200, 255, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: riskScore > 85 ? 'rgba(255, 48, 64, 1)' : 'rgba(0, 200, 255, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(0, 200, 255, 1)',
                },
            ],
        };
    };

    const radarOptions = {
        scales: {
            r: {
                angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                pointLabels: { color: '#c8e8f0', font: { family: "'Share Tech Mono', monospace", size: 10 } },
                ticks: { display: false, min: 0, max: 100 }
            }
        },
        plugins: {
            legend: { display: false }
        },
        maintainAspectRatio: false
    };

    return (
        <div className="page active" id="page-overview">
            {isCallActive && riskScore > 85 && (
                <div className="alert-banner">
                    <span className="alert-icon">🚨</span>
                    <span className="alert-text">GOLDEN MINUTE ALERT: Active scam call detected — Channel {currentChannel}, Risk {riskScore}%, Family notified</span>
                    <span className="alert-time">LIVE</span>
                    <button className="btn-action red" style={{ marginLeft: '12px' }}>INTERVENE</button>
                </div>
            )}

            <div className="grid-4">
                <div className="panel kpi">
                    <div className="panel-head"><div className="panel-title">ACTIVE THREATS</div></div>
                    <div className="kpi-val red">{isCallActive ? 48 : 47}</div>
                    <div className="kpi-label">LIVE RIGHT NOW</div>
                    <div className="kpi-delta up">▲ {isCallActive ? 13 : 12} from last hour</div>
                </div>
                <div className="panel kpi">
                    <div className="panel-head"><div className="panel-title">SCAMS BLOCKED</div></div>
                    <div className="kpi-val cyan">1,284</div>
                    <div className="kpi-label">TODAY TOTAL</div>
                    <div className="kpi-delta down">▼ 8% vs yesterday</div>
                </div>
                <div className="panel kpi">
                    <div className="panel-head"><div className="panel-title">VICTIMS PROTECTED</div></div>
                    <div className="kpi-val green">₹2.4Cr</div>
                    <div className="kpi-label">MONEY SAVED TODAY</div>
                    <div className="kpi-delta down">▼ Loss prevented</div>
                </div>
                <div className="panel kpi">
                    <div className="panel-head"><div className="panel-title">VOICEPRINTS</div></div>
                    <div className="kpi-val orange">38</div>
                    <div className="kpi-label">UNIQUE SUSPECTS</div>
                    <div className="kpi-delta up">▲ 3 new today</div>
                </div>
            </div>

            <div className="grid-7030">
                {/* Live Feed / Transcript */}
                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">{isCallActive ? "LIVE TRANSCRIPT SENSOR" : "REAL-TIME SCAM FEED"}</div>
                        <div className="panel-tag" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isCallActive ? 'var(--red)' : 'var(--green)', display: 'inline-block', animation: 'pulse 1s infinite' }}></span>
                            LIVE
                        </div>
                    </div>
                    <div id="liveFeed" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                        {isCallActive ? (
                            transcriptHistory.length === 0 ? (
                                <div style={{ color: 'var(--muted)', fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', padding: '10px' }}>
                                    Awaiting incoming audio vectors on Channel: {currentChannel}...
                                </div>
                            ) : (
                                transcriptHistory.map((t, i) => (
                                    <div key={i} className="feed-item" style={{ animation: 'none' }}>
                                        <div className={`feed-sev ${t.speaker === 'local' ? 'med' : 'high'}`}></div>
                                        <div className="feed-content">
                                            <div className="feed-title" style={{ fontFamily: 'sans-serif', fontStyle: 'italic', fontWeight: 'normal', color: t.speaker === 'local' ? 'var(--cyan)' : 'var(--text)' }}>"{t.text}"</div>
                                            <div className="feed-meta">{t.speaker.toUpperCase()} SPEAKER · {new Date(t.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                        {i === transcriptHistory.length - 1 && (
                                            <div className={`feed-score ${riskScore > 85 ? 'high' : riskScore > 50 ? 'med' : ''}`} style={{ border: 'none', background: 'transparent' }}>
                                                {riskScore}% RISK
                                            </div>
                                        )}
                                    </div>
                                ))
                            )
                        ) : (
                            feedData.map((f, i) => (
                                <div key={i} className="feed-item">
                                    <div className={`feed-sev ${f.sev}`}></div>
                                    <div className="feed-content">
                                        <div className="feed-title">{f.title}</div>
                                        <div className="feed-meta">{f.meta}</div>
                                    </div>
                                    <div className={`feed-score ${f.cls}`}>{f.score}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Switch between Scam Types Bar Chart and Live Radar */}
                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">{isCallActive ? "SCAM DNA (LIVE)" : "SCAM TYPES TODAY"}</div>
                    </div>

                    {isCallActive ? (
                        <div style={{ height: '220px', width: '100%' }}>
                            <Radar data={getRadarData()} options={radarOptions} />
                        </div>
                    ) : (
                        <>
                            <div className="bar-chart">
                                {typeData.map((d, i) => (
                                    <div key={i} className="bar-wrap">
                                        <div className="bar-val">{d.v}</div>
                                        <div className="bar" style={{ height: `${(d.v / maxType) * 80}px` }}></div>
                                        <div className="bar-lbl">{d.l}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
                                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>◈ BANKING FRAUD — 31%</div>
                                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>◈ OTP THEFT — 24%</div>
                                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>◈ KYC SCAM — 18%</div>
                                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>◈ JOB SCAM — 14%</div>
                                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>◈ INVESTMENT — 8%</div>
                                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>◈ OTHER — 5%</div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Suspect Table */}
            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">HIGH-PRIORITY SUSPECT PROFILES</div>
                    <button className="btn-action">EXPORT CSV</button>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>SUSPECT ID</th><th>SCAM TYPE</th><th>VICTIMS</th><th>AMOUNT AT RISK</th><th>RISK TIER</th><th>LAST ACTIVE</th><th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--cyan)' }}>#SUS-0047</td>
                            <td>OTP / Banking</td><td>14</td><td>₹8.2L</td>
                            <td><span className="risk-pill critical">CRITICAL</span></td>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px' }}>2 MIN AGO</td>
                            <td><button className="btn-action red">FLAG</button> <button className="btn-action">PROFILE →</button></td>
                        </tr>
                        <tr>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--cyan)' }}>#SUS-0031</td>
                            <td>Investment Fraud</td><td>9</td><td>₹22.1L</td>
                            <td><span className="risk-pill critical">CRITICAL</span></td>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px' }}>18 MIN AGO</td>
                            <td><button className="btn-action red">FLAG</button> <button className="btn-action">PROFILE →</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Overview;
