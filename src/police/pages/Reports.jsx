import React from 'react';

const Reports = () => {
    const weekData = [{ v: 112, l: 'MON' }, { v: 98, l: 'TUE' }, { v: 134, l: 'WED' }, { v: 121, l: 'THU' }, { v: 156, l: 'FRI' }, { v: 89, l: 'SAT' }, { v: 72, l: 'SUN' }];
    const maxWeek = Math.max(...weekData.map(d => d.v));

    return (
        <div className="page active" id="page-reports">
            <div className="grid-2">
                <div className="panel">
                    <div className="panel-head"><div className="panel-title">WEEKLY TREND</div></div>
                    <div className="bar-chart">
                        {weekData.map((d, i) => (
                            <div key={i} className="bar-wrap">
                                <div className="bar-val">{d.v}</div>
                                <div className="bar" style={{ height: `${(d.v / maxWeek) * 80}px` }}></div>
                                <div className="bar-lbl">{d.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="panel">
                    <div className="panel-head"><div className="panel-title">VULNERABILITY BREAKDOWN</div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}><span>Age 60+</span><span style={{ color: 'var(--red)', fontFamily: "'Share Tech Mono', monospace" }}>44%</span></div>
                            <div style={{ background: 'rgba(255,255,255,0.06)', height: '6px' }}><div style={{ width: '44%', height: '100%', background: 'var(--red)' }}></div></div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}><span>Age 45–60</span><span style={{ color: 'var(--orange)', fontFamily: "'Share Tech Mono', monospace" }}>28%</span></div>
                            <div style={{ background: 'rgba(255,255,255,0.06)', height: '6px' }}><div style={{ width: '28%', height: '100%', background: 'var(--orange)' }}></div></div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}><span>Age 30–45</span><span style={{ color: 'var(--yellow)', fontFamily: "'Share Tech Mono', monospace" }}>18%</span></div>
                            <div style={{ background: 'rgba(255,255,255,0.06)', height: '6px' }}><div style={{ width: '18%', height: '100%', background: 'var(--yellow)' }}></div></div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}><span>Age 18–30</span><span style={{ color: 'var(--cyan)', fontFamily: "'Share Tech Mono', monospace" }}>10%</span></div>
                            <div style={{ background: 'rgba(255,255,255,0.06)', height: '6px' }}><div style={{ width: '10%', height: '100%', background: 'var(--cyan)' }}></div></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">SCAM AUTOPSY REPORTS</div>
                    <button className="btn-action">GENERATE REPORT</button>
                </div>
                <table className="data-table">
                    <thead><tr><th>REPORT</th><th>CASE</th><th>TACTIC USED</th><th>TRIGGER</th><th>PREDICTED NEXT MOVE</th><th>DOWNLOAD</th></tr></thead>
                    <tbody>
                        <tr>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--cyan)' }}>RPT-2025-0312</td>
                            <td>#4821</td><td>OTP Theft + Urgency</td><td>Fear + Authority</td>
                            <td>Ask for UPI PIN next</td>
                            <td><button className="btn-action">↓ PDF</button></td>
                        </tr>
                        <tr>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--cyan)' }}>RPT-2025-0311</td>
                            <td>#4809</td><td>Fake Investment Returns</td><td>Greed + Urgency</td>
                            <td>Request advance payment</td>
                            <td><button className="btn-action">↓ PDF</button></td>
                        </tr>
                        <tr>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--cyan)' }}>RPT-2025-0308</td>
                            <td>#4798</td><td>Bank Account Blocked</td><td>Fear + Time Pressure</td>
                            <td>Transfer to "safe account"</td>
                            <td><button className="btn-action">↓ PDF</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reports;
