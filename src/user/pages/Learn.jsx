import React from 'react';

const Learn = () => {
    const learnCards = [
        { icon: '📞', title: 'Banking / OTP Scams', color: 'var(--red-u)', tactics: ['Fake bank officials call you', 'Claim your account is blocked', 'Ask for OTP to "unblock"'], tip: 'Real banks NEVER ask for OTP over phone. Hang up and call bank directly.' },
        { icon: '💼', title: 'Job / WFH Scams', color: 'var(--orange-u)', tactics: ['Offer ₹500–2000/hr for simple tasks', 'Ask for advance "registration fee"', 'Disappear after payment'], tip: 'Legitimate jobs never ask you to pay to start working.' },
        { icon: '🏆', title: 'Lottery Scams', color: 'var(--yellow-u)', tactics: ['You\'ve "won" without entering', 'Ask for processing/tax fee first', 'Create excitement and urgency'], tip: 'If you didn\'t enter a contest, you cannot have won. Always ignore.' },
        { icon: '🏦', title: 'KYC Fraud SMS', color: 'var(--purple-u)', tactics: ['SMS with urgent KYC update link', 'Fake bank login page steals details', 'Your account appears legitimate'], tip: 'Visit your bank branch for KYC. Never click SMS links from unknown numbers.' },
        { icon: '📦', title: 'Fake Delivery Scams', color: 'var(--blue-u)', tactics: ['"Delivery failed due to unpaid ₹5 fee"', 'Provides convincing tracking link', 'Steals card info during "payment"'], tip: 'Track securely only via official apps (Amazon/Flipkart). Never pay tiny fees via SMS links.' },
        { icon: '⚡', title: 'Electricity Disconnect', color: 'var(--red-u)', tactics: ['"Power will be cut at 9PM tonight"', 'Provides a personal mobile number to call', 'Forces you to download screen sharing app'], tip: 'Electricity boards never message from personal 10-digit numbers.' },
        { icon: '🚨', title: 'Digital Arrest Scams', color: 'var(--purple-u)', tactics: ['Fake police/CBI video call you', 'Claim illegal parcel in your name', 'Demand "security deposit" to avoid arrest'], tip: 'Real police will never "digitally arrest" you or ask for money to waive charges.' },
        { icon: '🪙', title: 'Crypto / Investment', color: 'var(--green-u)', tactics: ['Promise guaranteed 200% returns', 'Show fake trading dashboard profits', 'Block withdrawals after huge deposits'], tip: 'If returns sound too good to be true, they are. Guaranteed high returns = scam.' },
    ];

    return (
        <div className="page active" id="page-learn" style={{ paddingTop: '10px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px', marginLeft: '16px', color: 'white' }}>Settings</h1>

            <div className="section-label" style={{ marginLeft: '32px' }}>Scam Dictionary</div>
            <div className="list-group" style={{ margin: '0 16px 24px' }}>
                {learnCards.map((l, i) => (
                    <div key={i} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <div className="li-icon" style={{ background: l.color }}>{l.icon}</div>
                            <div className="li-content">
                                <div className="li-title">{l.title}</div>
                            </div>
                            <div className="li-right">〉</div>
                        </div>

                        <div style={{ marginTop: '12px', width: '100%' }}>
                            <ul style={{ paddingLeft: '24px', margin: 0, color: 'var(--text-u)', fontSize: '15px', lineHeight: 1.4 }}>
                                {l.tactics.map((t, j) => (
                                    <li key={j} style={{ marginBottom: '6px' }}>{t}</li>
                                ))}
                            </ul>
                            <div style={{
                                marginTop: '12px',
                                fontSize: '14px',
                                color: 'var(--muted-u)',
                                borderTop: '1px solid var(--border-u)',
                                paddingTop: '12px'
                            }}>
                                <strong style={{ color: 'var(--green-u)' }}>Protection:</strong> {l.tip}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="section-label" style={{ marginLeft: '32px' }}>General</div>
            <div className="list-group" style={{ margin: '0 16px 24px' }}>
                <div className="list-item">
                    <div className="li-icon" style={{ background: 'var(--muted2-u)' }}>⚙️</div>
                    <div className="li-content">
                        <div className="li-title">General Settings</div>
                    </div>
                    <div className="li-right">〉</div>
                </div>
                <div className="list-item">
                    <div className="li-icon" style={{ background: 'var(--blue-u)' }}>ℹ️</div>
                    <div className="li-content">
                        <div className="li-title">About Scam Shield</div>
                    </div>
                    <div className="li-right">〉</div>
                </div>
            </div>
        </div>
    );
};

export default Learn;
