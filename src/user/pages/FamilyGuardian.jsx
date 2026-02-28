import React, { useState } from 'react';

const FamilyGuardian = () => {
    const initialContacts = [
        { id: 1, name: 'Priya S.', role: 'Daughter', emoji: '👩', on: true },
        { id: 2, name: 'Karthik R.', role: 'Son', emoji: '👨', on: true },
        { id: 3, name: 'Dr. Meena', role: 'Family Doctor', emoji: '👩‍⚕️', on: false },
    ];

    const [contacts, setContacts] = useState(initialContacts);

    const toggleContact = (id) => {
        setContacts(contacts.map(c => c.id === id ? { ...c, on: !c.on } : c));
    };

    const addContact = () => {
        alert('Contact added! (Demo)');
    };

    return (
        <div className="page active" id="page-family">
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>👨‍👩‍👧 Family Guardian</div>
            <div style={{ fontSize: '12px', color: 'var(--muted-u)', marginBottom: '16px' }}>When scam risk hits 85%+, these contacts get an instant alert with details.</div>

            <div className="user-card">
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⏱️ The Golden Minute
                    <span style={{ fontSize: '10px', background: 'rgba(239,68,68,0.12)', color: 'var(--red-u)', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>ACTIVE</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted-u)', lineHeight: 1.6, marginBottom: '12px' }}>
                    When your scam risk exceeds <strong style={{ color: 'var(--text-u)' }}>85%</strong>, your family gets a WhatsApp alert with a 30-second call recording and a "CALL THEM NOW" button — in real time.
                </div>
            </div>

            <div className="user-card">
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Alert Contacts</div>
                <div id="contactsList">
                    {contacts.map((c) => (
                        <div key={c.id} className="contact-card">
                            <div className="contact-avatar">{c.emoji}</div>
                            <div className="contact-info">
                                <div className="contact-name">{c.name}</div>
                                <div className="contact-role">{c.role}</div>
                            </div>
                            <div className={`u-toggle ${c.on ? 'on' : ''}`} onClick={() => toggleContact(c.id)}></div>
                        </div>
                    ))}
                </div>
                <button className="add-contact-btn" onClick={addContact}>
                    <span>＋</span> Add Emergency Contact
                </button>
            </div>

            <div className="user-card">
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Alert History</div>
                <div style={{ padding: '12px', background: 'var(--bg2-u)', borderRadius: '10px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>⚠️ Alert sent — Banking Scam Call</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-u)' }}>Sent to: Priya (Daughter) · Risk: 92% · Today 10:14 AM</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg2-u)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '2px', color: 'var(--muted2-u)' }}>⚠️ Alert sent — KYC SMS</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-u)' }}>Sent to: Karthik (Son) · Risk: 88% · Yesterday 3:42 PM</div>
                </div>
            </div>
        </div>
    );
};

export default FamilyGuardian;
