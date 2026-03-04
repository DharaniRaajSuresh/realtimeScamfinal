import React from 'react';

const History = () => {
    const historyData = [
        { icon: '📞', type: 'danger', title: '+91 80000 12345', sub: 'SBI Account Blocked', date: '10:14 AM' },
        { icon: '💬', type: 'warn', title: '+91 98765 43210', sub: 'WhatsApp Job Offer', date: 'Yesterday' },
        { icon: '📞', type: 'safe', title: 'SBI OTP', sub: 'Real transaction OTP', date: 'Monday' },
        { icon: '📞', type: 'danger', title: 'Unknown', sub: 'KYC Update Call', date: 'Sunday' },
        { icon: '💬', type: 'safe', title: 'Amazon', sub: 'Order delivery update', date: '12/02/26' },
    ];

    const getIconColor = (type) => {
        if (type === 'danger') return 'var(--red-u)';
        if (type === 'warn') return 'var(--orange-u)';
        if (type === 'safe') return 'var(--text-u)';
        return 'var(--text-u)';
    };

    return (
        <div className="page active" id="page-history" style={{ paddingTop: '10px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px', marginLeft: '16px', color: 'white' }}>Recents</h1>

            <div className="list-group">
                {historyData.map((h, i) => (
                    <div key={i} className="list-item">
                        <div className="li-content" style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <div className="li-title" style={{ color: getIconColor(h.type), fontWeight: h.type === 'danger' ? 600 : 400 }}>
                                    {h.title}
                                </div>
                                <div className="li-sub">
                                    {h.icon} {h.sub}
                                </div>
                            </div>
                            <div className="li-right">
                                <span style={{ marginRight: '8px' }}>{h.date}</span>
                                <span style={{ color: 'var(--blue-u)', fontSize: '20px' }}>ⓘ</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="section-label">Reports</div>
            <div className="list-group">
                <button className="list-item" style={{ width: '100%', border: 'none', textAlign: 'left', background: 'var(--card-u)' }}>
                    <div className="li-content" style={{ color: 'var(--blue-u)' }}>
                        <div className="li-title" style={{ color: 'var(--blue-u)' }}>Autopsy Report — Case #4821</div>
                    </div>
                    <div className="li-right">
                        <span style={{ fontSize: '18px' }}>↓</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default History;
