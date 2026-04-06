import React, { useState, useEffect, useRef, useCallback } from 'react';

const Voiceprint = () => {
    // Live data from Qdrant
    const [voiceprints, setVoiceprints] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, total_victims: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Upload / Compare state
    const [uploading, setUploading] = useState(false);
    const [comparing, setComparing] = useState(null); // point_id being compared
    const [matchResult, setMatchResult] = useState(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [selectedTranscript, setSelectedTranscript] = useState(null);

    const fileInputRef = useRef(null);
    const compareInputRef = useRef(null);
    const activeCompareId = useRef(null);

    // Fetch voiceprints from backend
    const fetchVoiceprints = useCallback(async () => {
        try {
            const res = await fetch('/api/voice/voiceprints');
            if (!res.ok) throw new Error('Failed to fetch voiceprints');
            const data = await res.json();
            setVoiceprints(data.voiceprints || []);
            setStats(data.stats || { total: 0, active: 0, total_victims: 0 });
            setError(null);
        } catch (err) {
            console.error('Voiceprint fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVoiceprints();
        // Poll every 30 seconds
        const interval = setInterval(fetchVoiceprints, 30000);
        return () => clearInterval(interval);
    }, [fetchVoiceprints]);

    // Generate animated waveform bars
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

    // Handle "UPLOAD NEW AUDIO" — runs full compare pipeline
    const handleUploadClick = () => {
        activeCompareId.current = null;
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setMatchResult(null);

        try {
            const formData = new FormData();
            formData.append('audio', file);

            const res = await fetch('/api/voice/compare', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (data.success) {
                setMatchResult(data.result);
                setShowResultModal(true);
                // Refresh the list
                fetchVoiceprints();
            } else {
                setMatchResult({ matched: false, verdict: 'ERROR', message: data.error || 'Processing failed' });
                setShowResultModal(true);
            }
        } catch (err) {
            setMatchResult({ matched: false, verdict: 'ERROR', message: err.message });
            setShowResultModal(true);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // Handle per-row "MATCH AUDIO" button
    const handleMatchClick = (pointId) => {
        activeCompareId.current = pointId;
        compareInputRef.current?.click();
    };

    const handleCompareUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const pointId = activeCompareId.current;
        setComparing(pointId);
        setMatchResult(null);

        try {
            const formData = new FormData();
            formData.append('audio', file);

            const res = await fetch('/api/voice/compare', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (data.success) {
                setMatchResult(data.result);
                setShowResultModal(true);
                fetchVoiceprints();
            } else {
                setMatchResult({ matched: false, verdict: 'ERROR', message: data.error || 'Processing failed' });
                setShowResultModal(true);
            }
        } catch (err) {
            setMatchResult({ matched: false, verdict: 'ERROR', message: err.message });
            setShowResultModal(true);
        } finally {
            setComparing(null);
            e.target.value = '';
        }
    };

    // Time formatting helper
    const formatTime = (isoStr) => {
        if (!isoStr) return 'N/A';
        try {
            const d = new Date(isoStr);
            const now = new Date();
            const diff = (now - d) / 1000;
            if (diff < 60) return 'JUST NOW';
            if (diff < 3600) return `${Math.floor(diff / 60)} MIN AGO`;
            if (diff < 86400) return `${Math.floor(diff / 3600)} HR AGO`;
            if (diff < 604800) return `${Math.floor(diff / 86400)} DAYS AGO`;
            return d.toLocaleDateString();
        } catch {
            return isoStr.substring(0, 10);
        }
    };

    // Generate a short alias from scam_type + city
    const generateAlias = (vp, idx) => {
        const city = (vp.city || 'UNKNOWN').toUpperCase();
        const type = (vp.scam_type || '').toUpperCase();
        if (type.includes('BANK') || type.includes('OTP')) return `${city} BANKER`;
        if (type.includes('INVEST')) return `${city} BROKER`;
        if (type.includes('KYC')) return `${city} KYC CALLER`;
        if (type.includes('JOB')) return `${city} RECRUITER`;
        return `${city} CALLER #${idx + 1}`;
    };

    return (
        <div className="page active" id="page-voiceprint">
            {/* KPI Cards — live data */}
            <div className="grid-3" style={{ marginBottom: '16px' }}>
                <div className="panel kpi">
                    <div className="kpi-val orange">{loading ? '--' : stats.total}</div>
                    <div className="kpi-label">REGISTERED VOICEPRINTS</div>
                </div>
                <div className="panel kpi">
                    <div className="kpi-val red">{loading ? '--' : stats.active}</div>
                    <div className="kpi-label">ACTIVE SUSPECTS</div>
                </div>
                <div className="panel kpi">
                    <div className="kpi-val green">{loading ? '--' : stats.total_victims}</div>
                    <div className="kpi-label">VICTIMS LINKED TO PRINTS</div>
                </div>
            </div>

            {/* Forensic Case Cards - Unified Reporting (v2.0) */}
            <div className="panel" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                <div className="panel-head" style={{ marginBottom: '20px' }}>
                    <div className="panel-title">FORENSIC REPORT FEED</div>
                    <button
                        className="btn-action active"
                        onClick={handleUploadClick}
                        disabled={uploading}
                        style={uploading ? { opacity: 0.6 } : {}}
                    >
                        {uploading ? '⏳ PROCESSING...' : '🔍 ANALYZE NEW CALL'}
                    </button>
                </div>

                {/* Hidden file inputs for Analysis (v2.0) */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.opus,.webm,.wav,.mp3,.ogg"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                />
                <input
                    ref={compareInputRef}
                    type="file"
                    accept="audio/*,.opus,.webm,.wav,.mp3,.ogg"
                    style={{ display: 'none' }}
                    onChange={handleCompareUpload}
                />

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: 'var(--muted)', fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', letterSpacing: '2px' }}>
                        ⏳ DECRYPTING FORENSIC DATA...
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: 'var(--red)', fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', letterSpacing: '2px' }}>
                        ⚠ {error}
                    </div>
                ) : voiceprints.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: 'var(--muted)', fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', letterSpacing: '2px' }}>
                        NO REPORTS IN FEED.
                    </div>
                ) : (
                    <div className="grid-3" style={{ gap: '20px' }}>
                        {voiceprints.map((v, idx) => {
                            const riskColor = v.risk_score > 80 ? 'var(--red)' : v.risk_score > 50 ? 'var(--orange)' : 'var(--green)';
                            const matchColor = v.is_repeat ? 'var(--red)' : 'var(--green)';
                            
                            return (
                                <div key={v.case_id || idx} className="panel case-card" style={{ 
                                    padding: '20px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '12px',
                                    position: 'relative',
                                    border: `1px solid ${v.is_repeat ? 'rgba(255,48,64,0.3)' : 'var(--border)'}`
                                }}>
                                    {/* Header: Case ID + Risk */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px' }}>CASE ID</div>
                                            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--cyan)' }}>{v.case_id}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--muted)', letterSpacing: '1px' }}>RISK SCORE</div>
                                            <div style={{ fontSize: '18px', fontWeight: 800, color: riskColor }}>{v.risk_score}%</div>
                                        </div>
                                    </div>

                                    {/* AI Forensic Analysis (v2.0) */}
                                    <div style={{ 
                                        background: 'rgba(0,255,255,0.03)', 
                                        padding: '12px', 
                                        border: `1px solid ${v.risk_score > 75 ? 'rgba(255,48,64,0.3)' : 'var(--border)'}`,
                                        fontSize: '11px',
                                        lineHeight: '1.6',
                                        color: 'var(--text)',
                                        minHeight: '80px',
                                        fontStyle: v.transcript_summary === "No summary available" ? 'italic' : 'normal',
                                        opacity: v.transcript_summary === "No summary available" ? 0.6 : 1,
                                        position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                            <div style={{ fontSize: '8px', color: 'var(--cyan)', fontWeight: 800, letterSpacing: '2px' }}>DEEP FORENSIC ANALYSIS</div>
                                            {v.risk_score > 75 && (
                                                <div style={{ fontSize: '7px', background: 'rgba(255,48,64,0.2)', color: 'var(--red)', padding: '2px 6px', border: '1px solid var(--red)', borderRadius: '2px', fontWeight: 900, letterSpacing: '1px' }}>HIGH THREAT</div>
                                            )}
                                        </div>
                                        <div style={{ color: 'var(--text)', fontSize: '11px', fontFamily: 'Inter, sans-serif' }}>
                                            {v.transcript_summary}
                                        </div>
                                    </div>

                                    {/* Match Result */}
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '10px',
                                        padding: '8px 0',
                                        borderBottom: '1px solid var(--border)'
                                    }}>
                                        <div style={{ 
                                            width: '8px', 
                                            height: '8px', 
                                            borderRadius: '50%', 
                                            background: matchColor,
                                            boxShadow: `0 0 8px ${matchColor}`
                                        }} />
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: matchColor, letterSpacing: '1px' }}>
                                            {v.status.toUpperCase()}
                                        </div>
                                        {v.is_repeat && (
                                            <div style={{ fontSize: '10px', color: 'var(--muted)', marginLeft: 'auto' }}>
                                                {Math.round(v.match_score * 100)}% Match
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Info */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)' }}>
                                        <span>SCAMMER ID: {v.scammer_id.substring(0, 8)}...</span>
                                        <span>{v.created_at}</span>
                                    </div>

                                    {/* Audio Reference */}
                                    {v.audio_url && v.audio_url !== "" ? (
                                        <div style={{ marginTop: '8px' }}>
                                            <audio controls style={{ width: '100%', height: '32px' }} src={v.audio_url} />
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '8px', fontSize: '9px', color: 'var(--muted)', textAlign: 'center', padding: '8px', border: '1px dashed var(--border)' }}>
                                            AUDIO REFERENCE UNAVAILABLE
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                                        <button 
                                            className="btn-action" 
                                            style={{ flex: 1, fontSize: '9px' }}
                                            onClick={() => setSelectedTranscript(v.transcript)}
                                        >
                                            VIEW TRANSCRIPT
                                        </button>
                                        {v.is_repeat && (
                                            <button className="btn-action active" style={{ flex: 1, fontSize: '9px' }}>LINKED CASES</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Match Result Modal */}
            {showResultModal && matchResult && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)'
                    }}
                    onClick={() => setShowResultModal(false)}
                >
                    <div
                        style={{
                            background: 'var(--panel)', border: '1px solid var(--border2)',
                            padding: '28px', maxWidth: '500px', width: '90%',
                            position: 'relative', overflow: 'hidden'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Top glow */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                            background: matchResult.matched ? 'linear-gradient(90deg, transparent, var(--red), transparent)' : 'linear-gradient(90deg, transparent, var(--green), transparent)'
                        }} />

                        <div style={{
                            fontFamily: "'Share Tech Mono', monospace", fontSize: '10px',
                            letterSpacing: '2px', color: 'var(--muted)', marginBottom: '16px'
                        }}>
                            // VOICE MATCH ANALYSIS RESULT
                        </div>

                        {/* Verdict Badge */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px'
                        }}>
                            <div style={{
                                fontSize: '28px', fontWeight: 700,
                                color: matchResult.matched ? 'var(--red)' : matchResult.verdict === 'ERROR' ? 'var(--orange)' : 'var(--green)',
                                textShadow: matchResult.matched ? 'var(--glow-red)' : 'none'
                            }}>
                                {matchResult.matched ? '🚨' : matchResult.verdict === 'ERROR' ? '⚠️' : '✅'}
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '20px', fontWeight: 700,
                                    color: matchResult.matched ? 'var(--red)' : matchResult.verdict === 'ERROR' ? 'var(--orange)' : 'var(--green)'
                                }}>
                                    {matchResult.verdict}
                                </div>
                                {matchResult.confidence && (
                                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', color: 'var(--muted)' }}>
                                        CONFIDENCE: {matchResult.confidence}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Match Details */}
                        {matchResult.matched && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div style={{ background: 'rgba(0,200,255,0.04)', padding: '10px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '4px' }}>VICTIM COUNT</div>
                                        <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--orange)' }}>{matchResult.victim_count}</div>
                                    </div>
                                    <div style={{ background: 'rgba(0,200,255,0.04)', padding: '10px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '4px' }}>SCAM TYPE</div>
                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{matchResult.scam_type}</div>
                                    </div>
                                    <div style={{ background: 'rgba(0,200,255,0.04)', padding: '10px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '4px' }}>FIRST REPORTED</div>
                                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', color: 'var(--cyan)' }}>{matchResult.first_reported}</div>
                                    </div>
                                    <div style={{ background: 'rgba(0,200,255,0.04)', padding: '10px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '4px' }}>REGION</div>
                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{matchResult.city || 'N/A'}, {matchResult.district || ''}</div>
                                    </div>
                                </div>

                                {matchResult.linked_cases && matchResult.linked_cases.length > 0 && (
                                    <div style={{ background: 'rgba(255,48,64,0.05)', padding: '10px', border: '1px solid rgba(255,48,64,0.2)' }}>
                                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--red)', letterSpacing: '2px', marginBottom: '6px' }}>LINKED CASES</div>
                                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: 'var(--text)' }}>
                                            {matchResult.linked_cases.join(' · ')}
                                        </div>
                                    </div>
                                )}

                                {matchResult.other_matches && matchResult.other_matches.length > 0 && (
                                    <div style={{ background: 'rgba(0,200,255,0.04)', padding: '10px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '6px' }}>OTHER PARTIAL MATCHES</div>
                                        {matchResult.other_matches.map((m, i) => (
                                            <div key={i} style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--orange)', marginBottom: '2px' }}>
                                                {m.confidence} — {m.case_id} — {m.city} — {m.date}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Non-match message */}
                        {!matchResult.matched && matchResult.message && (
                            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
                                {matchResult.message}
                            </div>
                        )}

                        <button
                            className="btn-action"
                            onClick={() => setShowResultModal(false)}
                            style={{ marginTop: '20px', width: '100%', padding: '8px', textAlign: 'center' }}
                        >
                            CLOSE
                        </button>
                    </div>
                </div>
            )}
            {/* Full Transcript Modal (v2.0) */}
            {selectedTranscript && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
                    zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(10px)', padding: '20px'
                }} onClick={() => setSelectedTranscript(null)}>
                    <div style={{
                        background: 'var(--panel)', border: '1px solid var(--border)',
                        padding: '30px', maxWidth: '700px', width: '100%',
                        maxHeight: '80vh', overflowY: 'auto', position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ 
                            fontFamily: "'Share Tech Mono', monospace", 
                            fontSize: '12px', 
                            color: 'var(--cyan)', 
                            letterSpacing: '2px',
                            marginBottom: '20px',
                            borderBottom: '1px solid var(--border)',
                            paddingBottom: '10px'
                        }}>
                            // FULL FORENSIC TRANSCRIPT
                        </div>
                        <div style={{ 
                            fontSize: '14px', 
                            lineHeight: '1.8', 
                            color: 'var(--text)',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'Inter, sans-serif',
                            color: 'white'
                        }}>
                            {selectedTranscript}
                        </div>
                        <button 
                            className="btn-action active" 
                            style={{ marginTop: '30px', width: '100%' }}
                            onClick={() => setSelectedTranscript(null)}
                        >
                            CLOSE TRANSCRIPT
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Voiceprint;
