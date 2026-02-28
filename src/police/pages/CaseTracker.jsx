import React from 'react';

const CaseTracker = () => {
    return (
        <div className="page active" id="page-cases">
            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">ACTIVE CASE TRACKER</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-action">FILTER</button>
                        <button className="btn-action active">+ NEW CASE</button>
                    </div>
                </div>
                <table className="data-table">
                    <thead><tr><th>CASE ID</th><th>VICTIM</th><th>TYPE</th><th>AMOUNT</th><th>STATUS</th><th>OFFICER</th><th>OPENED</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                        <tr>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--cyan)' }}>#CYB-2025-4821</td>
                            <td>P. Subramaniam (67)</td><td>Banking Fraud</td><td>₹2.5L</td>
                            <td><span className="risk-pill critical">ACTIVE — HIGH</span></td>
                            <td>Insp. Rajan</td>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px' }}>TODAY 10:14</td>
                            <td><button className="btn-action">OPEN →</button></td>
                        </tr>
                        <tr>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--cyan)' }}>#CYB-2025-4809</td>
                            <td>M. Kavitha (52)</td><td>Investment Scam</td><td>₹18L</td>
                            <td><span className="risk-pill high">INVESTIGATING</span></td>
                            <td>SI. Priya</td>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px' }}>YESTERDAY</td>
                            <td><button className="btn-action">OPEN →</button></td>
                        </tr>
                        <tr>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--cyan)' }}>#CYB-2025-4798</td>
                            <td>R. Venkat (44)</td><td>OTP Theft</td><td>₹85K</td>
                            <td><span className="risk-pill med">ESCALATED</span></td>
                            <td>HC. Murugan</td>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px' }}>3 DAYS AGO</td>
                            <td><button className="btn-action">OPEN →</button></td>
                        </tr>
                        <tr>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--cyan)' }}>#CYB-2025-4784</td>
                            <td>S. Lakshmi (71)</td><td>KYC Phishing</td><td>₹1.2L</td>
                            <td><span className="risk-pill med">PENDING FIR</span></td>
                            <td>Insp. Rajan</td>
                            <td style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px' }}>5 DAYS AGO</td>
                            <td><button className="btn-action">OPEN →</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CaseTracker;
