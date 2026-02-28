import React from 'react';

const Learn = () => {
    const learnCards = [
        { icon: '📞', title: 'Banking / OTP Scams', color: 'var(--red-u)', tactics: ['Fake bank officials call you', 'Claim your account is blocked', 'Ask for OTP to "unblock"'], tip: 'Real banks NEVER ask for OTP over phone. Hang up and call bank directly.' },
        { icon: '💼', title: 'Job / Work-From-Home Scams', color: 'var(--orange-u)', tactics: ['Offer ₹500–2000/hr for simple tasks', 'Ask for advance "registration fee"', 'Disappear after payment'], tip: 'Legitimate jobs never ask you to pay to start working.' },
        { icon: '🏆', title: 'Lottery / Prize Scams', color: 'var(--yellow-u)', tactics: ['You\'ve "won" without entering', 'Ask for processing/tax fee first', 'Create excitement and urgency'], tip: 'If you didn\'t enter a contest, you cannot have won. Always ignore.' },
        { icon: '🏦', title: 'KYC Fraud SMS', color: 'var(--purple-u)', tactics: ['SMS with urgent KYC update link', 'Fake bank login page steals details', 'Your account appears legitimate'], tip: 'Visit your bank branch for KYC. Never click SMS links from unknown numbers.' },
    ];

    return (
        <div className="page active" id="page-learn">
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>📚 Know Your Enemy</div>
            <div style={{ fontSize: '12px', color: 'var(--muted-u)', marginBottom: '16px' }}>Learn how every scam type works so you're never fooled</div>

            <div id="learnList">
                {learnCards.map((l, i) => (
                    <div key={i} className="user-card" style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{l.icon}</div>
                            <div style={{ fontSize: '14px', fontWeight: 800 }}>{l.title}</div>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted-u)', marginBottom: '8px' }}>How they do it:</div>
                        {l.tactics.map((t, j) => (
                            <div key={j} style={{ fontSize: '12px', padding: '6px 0', borderBottom: '1px solid var(--border-u)', display: 'flex', gap: '8px', color: 'var(--text-u)' }}>
                                <span style={{ color: l.color }}>▸</span>{t}
                            </div>
                        ))}
                        <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(34,197,94,0.07)', borderRadius: '8px', fontSize: '12px', color: 'rgba(34,197,94,0.9)' }}>
                            <strong>✅ Protect yourself:</strong> {l.tip}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Learn;
