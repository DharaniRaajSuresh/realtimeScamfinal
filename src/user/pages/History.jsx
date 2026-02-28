import React from 'react';

const History = () => {
    const historyData = [
        { icon: '🚨', type: 'danger', title: 'SBI Account Blocked SMS', sub: 'Banking Scam · Today 10:14 AM', score: '91%' },
        { icon: '⚠️', type: 'warn', title: 'WhatsApp Job Offer', sub: 'Job Scam · Yesterday 4:30 PM', score: '74%' },
        { icon: '✅', type: 'safe', title: 'OTP from SBI', sub: 'Real transaction OTP · Yesterday 2:15 PM', score: '8%' },
        { icon: '🚨', type: 'danger', title: 'KYC Update Call', sub: 'KYC Fraud · 3 days ago', score: '88%' },
        { icon: '✅', type: 'safe', title: 'Amazon Delivery SMS', sub: 'Order update · 4 days ago', score: '5%' },
    ];

    return (
        <div className="page active" id="page-history">
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>📋 My Scan History</div>
            <div className="user-card">
                <div id="historyList">
                    {historyData.map((h, i) => (
                        <div key={i} className="history-item">
                            <div className={`hist-icon ${h.type}`}>{h.icon}</div>
                            <div className="hist-info">
                                <div className="hist-title">{h.title}</div>
                                <div className="hist-sub">{h.sub}</div>
                            </div>
                            <div className={`hist-score ${h.type}`}>{h.score}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="user-card" style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>📄 Scam Autopsy Reports</div>
                <div style={{ fontSize: '12px', color: 'var(--muted-u)', marginBottom: '12px' }}>Detailed reports of detected scams — understand how they tried to manipulate you.</div>
                <button style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(79,142,255,0.1)', border: '1px solid rgba(79,142,255,0.3)', color: 'var(--blue-u)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    📥 Download Autopsy Report — Case #4821
                </button>
            </div>
        </div>
    );
};

export default History;
