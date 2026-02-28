import React, { useMemo } from 'react';

const Voiceprint = () => {
    const vpData = [
        { id: 'VP-0012', alias: 'REDFORT CALLER', victims: 14, last: '2 MIN AGO', status: 'ACTIVE' },
        { id: 'VP-0009', alias: 'MUMBAI OPERATOR', victims: 31, last: '4 HR AGO', status: 'ACTIVE' },
        { id: 'VP-0007', alias: 'UNKNOWN MALE #3', victims: 8, last: '2 DAYS AGO', status: 'DORMANT' },
        { id: 'VP-0003', alias: 'SYNDICATE LEAD A', victims: 47, last: '1 WEEK AGO', status: 'ARRESTED' },
    ];

    const renderBars = () => {
        return Array.from({ length: 30 }).map((_, i) => {
            const h = 4 + Math.sin(i * 0.8 + Math.random()) * 14 + Math.random() * 8;
            return (
                <div
                    key={i}
                    className="vp-bar"
                    style={{
                        height: `${h}px`,
                        animationDelay: `${i * 0.05}s`,
                        animationDuration: `${0.4 + Math.random() * 0.4}s`
                    }}
                ></div>
            );
        });
    };

    return (
        <div className="page active" id="page-voiceprint">
            <div className="grid-3" style={{ marginBottom: '16px' }}>
                <div className="panel kpi"><div className="kpi-val orange">38</div><div className="kpi-label">REGISTERED VOICEPRINTS</div></div>
                <div className="panel kpi"><div className="kpi-val red">3</div><div className="kpi-label">ACTIVE TODAY</div></div>
                <div className="panel kpi"><div className="kpi-val green">156</div><div className="kpi-label">VICTIMS LINKED TO PRINTS</div></div>
            </div>
            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">SUSPECT VOICEPRINT LIBRARY</div>
                    <button className="btn-action">UPLOAD NEW AUDIO</button>
                </div>
                <table className="data-table">
                    <thead><tr><th>PRINT ID</th><th>ALIAS</th><th>WAVEFORM</th><th>VICTIMS</th><th>LAST SEEN</th><th>STATUS</th><th>MATCH</th></tr></thead>
                    <tbody>
                        {vpData.map((v, idx) => {
                            const statColor = v.status === 'ACTIVE' ? 'var(--red)' : v.status === 'ARRESTED' ? 'var(--green)' : 'var(--muted)';
                            return (
                                <tr key={idx}>
                                    <td style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--cyan)' }}>{v.id}</td>
                                    <td style={{ fontWeight: 600 }}>{v.alias}</td>
                                    <td><div className="voiceprint">{renderBars()}</div></td>
                                    <td style={{ color: 'var(--orange)', fontFamily: "'Share Tech Mono', monospace" }}>{v.victims}</td>
                                    <td style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px' }}>{v.last}</td>
                                    <td style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: statColor }}>{v.status}</td>
                                    <td><button className="btn-action">MATCH AUDIO</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Voiceprint;
