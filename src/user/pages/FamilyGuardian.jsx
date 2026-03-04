import React, { useState } from 'react';

const FamilyGuardian = () => {
    const initialContacts = [
        { id: 1, name: 'Dr. Meena', role: 'Family Doctor', initials: 'DM', on: false },
        { id: 2, name: 'Karthik R.', role: 'Son', initials: 'KR', on: true },
        { id: 3, name: 'Priya S.', role: 'Daughter', initials: 'PS', on: true },
    ];

    const [contacts, setContacts] = useState(initialContacts);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newNumber, setNewNumber] = useState('');

    const toggleContact = (id) => {
        setContacts(contacts.map(c => c.id === id ? { ...c, on: !c.on } : c));
    };

    const handleAddContact = () => {
        if (!newName.trim() || !newNumber.trim()) {
            alert('Please enter both name and number.');
            return;
        }

        const names = newName.trim().split(' ');
        const initials = names.length > 1
            ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
            : newName.substring(0, 2).toUpperCase();

        const newContact = {
            id: Date.now(),
            name: newName.trim(),
            role: newNumber.trim(),
            initials: initials,
            on: true
        };

        setContacts([...contacts, newContact]);
        setNewName('');
        setNewNumber('');
        setIsAdding(false);
    };

    return (
        <div className="page active" id="page-family" style={{ paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 16px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'white' }}>Contacts</h1>
                <span style={{ fontSize: '24px', color: 'var(--blue-u)', cursor: 'pointer' }} onClick={() => setIsAdding(!isAdding)}>
                    {isAdding ? 'Cancel' : '+'}
                </span>
            </div>

            {isAdding && (
                <div className="list-group" style={{ margin: '0 16px 24px', padding: '16px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <input
                            type="text"
                            className="scan-input"
                            placeholder="Contact Name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-u)', background: 'var(--bg-u)', color: 'white', marginBottom: '8px' }}
                        />
                        <input
                            type="tel"
                            className="scan-input"
                            placeholder="Phone Number"
                            value={newNumber}
                            onChange={(e) => setNewNumber(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-u)', background: 'var(--bg-u)', color: 'white' }}
                        />
                    </div>
                    <button
                        className="scan-btn"
                        onClick={handleAddContact}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--blue-u)', color: 'white', border: 'none', fontWeight: 600 }}
                    >
                        Save Contact
                    </button>
                </div>
            )}

            <div className="list-group" style={{ margin: '0 16px 24px' }}>
                <div className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(239, 68, 68, 0.12)' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--red-u)', marginBottom: '4px' }}>The Golden Minute Active</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-u)', lineHeight: 1.4 }}>
                        When risk exceeds 85%, your active contacts will receive an emergency WhatsApp alert with a 30s call recording.
                    </div>
                </div>
            </div>

            <div className="list-group" style={{ margin: '0 16px 24px' }}>
                {contacts.map((c) => (
                    <div key={c.id} className="list-item">
                        <div className="li-icon" style={{ borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue-u), var(--purple-u))', fontSize: '14px', fontWeight: 600 }}>
                            {c.initials}
                        </div>
                        <div className="li-content">
                            <div className="li-title">{c.name}</div>
                            <div className="li-sub">{c.role}</div>
                        </div>
                        <div className="li-right">
                            <div className={`u-toggle ${c.on ? 'on' : ''}`} onClick={() => toggleContact(c.id)}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="section-label" style={{ marginLeft: '32px' }}>Recent Alerts</div>
            <div className="list-group" style={{ margin: '0 16px 24px' }}>
                <div className="list-item">
                    <div className="li-content">
                        <div className="li-title" style={{ color: 'var(--red-u)' }}>Banking Scam Call (92%)</div>
                        <div className="li-sub">Alerted Priya • Today</div>
                    </div>
                </div>
                <div className="list-item">
                    <div className="li-content">
                        <div className="li-title" style={{ color: 'var(--orange-u)' }}>KYC SMS Alert (88%)</div>
                        <div className="li-sub">Alerted Karthik • Yesterday</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FamilyGuardian;
