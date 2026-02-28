import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useScamContext } from '../../context/ScamContext';
import pako from 'pako';

const patterns = [
    { w: ['otp', 'one time', 'password'], t: 'OTP Theft' },
    { w: ['urgent', 'immediately', 'blocked', 'suspended'], t: 'Urgency Trigger' },
    { w: ['click', 'link', 'http', 'verify'], t: 'Phishing Link' },
    { w: ['account', 'bank', 'sbi', 'hdfc'], t: 'Bank Impersonation' },
    { w: ['kyc', 'update', 'expire'], t: 'KYC Scam' },
    { w: ['prize', 'won', 'lottery'], t: 'Fake Reward' },
    { w: ['police', 'arrested', 'legal'], t: 'Authority Threat' },
    { w: ['job', 'earn', 'work from home', 'registration fee'], t: 'Job Scam' },
];

// STT Bot UIDs - must match backend
const STT_SUB_BOT_UID = 1001;
const STT_PUB_BOT_UID = 1002;

const Analyze = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(0);

    // Global Context
    const { isCallActive, riskScore, scamTactics, startAnalysis, stopAnalysis, addTranscriptChunk, transcriptHistory } = useScamContext();

    // Call state
    const [channelName, setChannelName] = useState('demo-room-1');
    const [remoteConnected, setRemoteConnected] = useState(false);
    const agoraClient = useRef(null);
    const localAudioTrack = useRef(null);
    const currentAgentId = useRef(null);
    const myUidRef = useRef(null);

    // Live transcript display
    const [liveTranscripts, setLiveTranscripts] = useState([]);
    const transcriptEndRef = useRef(null);

    useEffect(() => {
        if (location.state?.startMic) {
            setActiveTab(0);
        }
        return () => {
            if (isCallActive) {
                leaveCall();
            }
        };
    }, []);

    // Auto-scroll transcript to bottom
    useEffect(() => {
        if (transcriptEndRef.current) {
            transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [liveTranscripts]);

    /**
     * Decode Agora STT data-stream message.
     * With enableJsonProtocol: true, data is gzip-compressed JSON.
     */
    const decodeSTTMessage = (data) => {
        try {
            console.log('[STT] Raw data received, length:', data?.length || data?.byteLength, 'type:', typeof data);

            // Convert to Uint8Array if needed
            let uint8Data;
            if (data instanceof Uint8Array) {
                uint8Data = data;
            } else if (data instanceof ArrayBuffer) {
                uint8Data = new Uint8Array(data);
            } else if (typeof data === 'string') {
                try { return JSON.parse(data); } catch (e) { }
                const encoder = new TextEncoder();
                uint8Data = encoder.encode(data);
            } else {
                console.warn('[STT] Unknown data type:', typeof data);
                return null;
            }

            // Try gzip decompression first (enableJsonProtocol sends gzipped JSON)
            let jsonStr;
            try {
                const decompressed = pako.inflate(uint8Data);
                jsonStr = new TextDecoder('utf-8').decode(decompressed);
                console.log('[STT] Gzip decompressed successfully');
            } catch (e) {
                // Not gzipped — try as raw UTF-8
                jsonStr = new TextDecoder('utf-8').decode(uint8Data);
            }

            const parsed = JSON.parse(jsonStr);
            console.log('[STT] Decoded JSON:', JSON.stringify(parsed).substring(0, 200));
            return parsed;
        } catch (err) {
            console.error('[STT] Failed to decode message:', err);
            try {
                let raw = data instanceof Uint8Array ? data : new Uint8Array(data);
                console.log('[STT] Raw hex:', Array.from(raw.slice(0, 50)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            } catch (e) { }
            return null;
        }
    };

    /**
     * Process decoded STT subtitle message and update UI.
     */
    const handleSTTSubtitle = (sttData) => {
        if (!sttData) return;

        // Agora STT JSON protocol format:
        // { transcript: { uid, language, text, isFinal, offset, duration, textTs } }
        const t = sttData.transcript || sttData;

        let text = t.text || '';
        let uid = String(t.uid || 'unknown');
        let isFinal = t.isFinal || false;

        if (!text.trim()) return;

        // Only show transcript from the OTHER user (scammer), not from ourselves
        if (myUidRef.current && uid === String(myUidRef.current)) {
            console.log(`[STT] Skipping own speech (UID ${uid})`);
            return;
        }

        console.log(`[STT] 📝 Scammer UID ${uid}: "${text}" (final: ${isFinal})`);

        const speakerLabel = uid;
        const entry = {
            uid: speakerLabel,
            text: text.trim(),
            isFinal,
            timestamp: Date.now()
        };

        setLiveTranscripts(prev => {
            // If not final, update the last entry from the same UID
            if (!isFinal) {
                const lastIdx = prev.findLastIndex(t => t.uid === speakerLabel && !t.isFinal);
                if (lastIdx >= 0) {
                    const updated = [...prev];
                    updated[lastIdx] = entry;
                    return updated;
                }
            }
            return [...prev, entry];
        });

        // If this is a final transcript, send it to the backend for scam analysis
        if (isFinal && text.trim().length > 2) {
            addTranscriptChunk(speakerLabel, text.trim());

            // Send to backend analyze endpoint
            fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: channelName,
                    speakerId: speakerLabel,
                    text: text.trim()
                })
            }).catch(err => console.error('[STT] Failed to send for analysis:', err));
        }
    };

    const joinCall = async () => {
        try {
            // 1. Generate a random UID for this user
            const myUid = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
            myUidRef.current = myUid;

            // 2. Fetch config from backend (token is null in test mode)
            const res = await fetch(`/api/agora/token/${channelName}?uid=${myUid}`);
            const data = await res.json();
            const token = data.token; // null in test mode
            const appId = data.appId || import.meta.env.VITE_AGORA_APP_ID || '';

            console.log(`🔌 Joining channel '${channelName}' with UID ${myUid}, appId: ${appId}, token: ${token}`);

            // 3. Initialize Agora Client
            agoraClient.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

            // Listen for remote users publishing audio or data
            agoraClient.current.on("user-published", async (user, mediaType) => {
                console.log(`[Agora] user-published: UID ${user.uid}, type: ${mediaType}`);
                await agoraClient.current.subscribe(user, mediaType);
                if (mediaType === "audio") {
                    // Don't play audio from STT bots, but DO subscribe (needed for data stream)
                    if (user.uid !== STT_SUB_BOT_UID && user.uid !== STT_PUB_BOT_UID) {
                        const remoteAudioTrack = user.audioTrack;
                        remoteAudioTrack.play();
                    }
                }
            });

            agoraClient.current.on("user-joined", (user) => {
                // Ignore the STT bots for the UI indicator
                if (user.uid !== STT_SUB_BOT_UID && user.uid !== STT_PUB_BOT_UID) {
                    setRemoteConnected(true);
                    console.log(`✅ User ${user.uid} joined the channel`);
                } else {
                    console.log(`🤖 STT Bot ${user.uid} joined the channel`);
                }
            });

            agoraClient.current.on("user-left", (user) => {
                if (user.uid !== STT_SUB_BOT_UID && user.uid !== STT_PUB_BOT_UID) {
                    setRemoteConnected(false);
                    console.log(`❌ User ${user.uid} left the channel`);
                }
            });

            // 🔑 KEY: Listen for data-stream messages from STT pubBot
            agoraClient.current.on("stream-message", (uid, data) => {
                console.log(`[STT] 📨 stream-message from UID ${uid}, data length: ${data?.length || data?.byteLength}`);
                const decoded = decodeSTTMessage(data);
                if (decoded) {
                    handleSTTSubtitle(decoded);
                }
            });

            agoraClient.current.on("stream-message-error", (uid, error) => {
                console.warn(`[STT] ❌ Stream message error from UID ${uid}:`, error);
            });

            // Join channel (token is null in test mode, which is fine)
            if (appId) {
                const uid = await agoraClient.current.join(appId, channelName, token, myUid);
                console.log(`🎤 Joined channel '${channelName}' with UID ${uid}`);

                // Check for existing human users
                const existingUsers = agoraClient.current.remoteUsers;
                const hasHuman = existingUsers.some(u => u.uid !== STT_SUB_BOT_UID && u.uid !== STT_PUB_BOT_UID);
                setRemoteConnected(hasHuman);
            } else {
                console.warn("No Agora App ID found.");
            }

            // 4. Create and publish local mic
            localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack();
            if (appId) {
                await agoraClient.current.publish([localAudioTrack.current]);
            }

            // 5. Trigger Server-Side STT
            try {
                const sttRes = await fetch(`/api/stt/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ channel_name: channelName })
                });
                const sttData = await sttRes.json();
                if (sttData.agent_id) {
                    currentAgentId.current = sttData.agent_id;
                    console.log("🔥 Agora Cloud STT Bot Deployed! Agent ID:", sttData.agent_id);
                } else {
                    console.warn("STT response:", sttData);
                }
            } catch (err) {
                console.error("Failed to start server-side STT:", err);
            }

            // 6. Start our local Context
            startAnalysis(channelName);
            setLiveTranscripts([]);

        } catch (error) {
            console.error("Error joining call:", error);
            startAnalysis(channelName);
        }
    };

    const leaveCall = async () => {
        setRemoteConnected(false);
        if (localAudioTrack.current) {
            localAudioTrack.current.stop();
            localAudioTrack.current.close();
            localAudioTrack.current = null;
        }

        if (agoraClient.current) {
            await agoraClient.current.leave();
            agoraClient.current = null;
        }

        if (currentAgentId.current) {
            try {
                await fetch(`/api/stt/stop`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agent_id: currentAgentId.current })
                });
                console.log("⏹ Agora Cloud STT Bot Stopped.");
            } catch (err) {
                console.error("Failed to stop STT", err);
            }
            currentAgentId.current = null;
        }

        stopAnalysis();
    };

    const toggleCall = () => {
        if (isCallActive) {
            leaveCall();
        } else {
            joinCall();
        }
    };

    const getMicStatus = () => {
        const v = riskScore;
        const lbl = v > 85 ? '🚨 CRITICAL RISK — Scam Detected!' : v > 60 ? '⚠️ HIGH RISK — Likely scam call!' : v > 35 ? '⚠️ Suspicious patterns detected' : '🔍 Listening for scam keywords...';
        const color = v > 85 ? 'var(--red-u)' : v > 60 ? 'var(--orange-u)' : v > 35 ? 'var(--yellow-u)' : 'var(--green-u)';
        const pulsingClass = v > 85 ? 'critical-pulse' : '';
        return { v, lbl, color, pulsingClass };
    };

    // SMS & Chat State
    const [smsInput, setSmsInput] = useState('');
    const [chatInput, setChatInput] = useState('');

    const [smsResult, setSmsResult] = useState(null);
    const [chatResult, setChatResult] = useState(null);

    const runOfflineAnalysis = (text) => {
        const lower = text.toLowerCase();
        const found = patterns.filter(p => p.w.some(w => lower.includes(w)));
        const score = Math.min(96, found.length * 15 + (lower.includes('http') ? 20 : 0) + (text.length > 80 ? 5 : 0));
        const isHigh = score >= 65, isMed = score >= 35 && score < 65;

        const tips = {
            'OTP Theft': '⚠️ Never share OTP with anyone — no bank, police, or government official will ever ask for it.',
            'Bank Impersonation': 'Hang up immediately. Call your bank\'s official number from the back of your card.',
            'Phishing Link': 'Do NOT click the link. Report to your network provider and the Cyber Crime helpline: 1930.',
            'KYC Scam': 'Banks never update KYC via SMS links. Visit the branch directly if KYC is needed.',
            'Urgency Trigger': 'Urgency is a manipulation tactic. Take a breath — real banks give you time to verify.',
        };

        const tip = found.length > 0 && tips[found[0].t] ? tips[found[0].t] : (isHigh ? 'Report to Cyber Crime Helpline: 1930' : 'This message appears safe. Stay alert and always verify before sharing personal information.');

        return {
            score,
            isHigh,
            isMed,
            found,
            title: isHigh ? '🚨 LIKELY SCAM — Do NOT respond!' : isMed ? '⚠️ Suspicious Message' : '✅ Looks Safe',
            sub: isHigh ? 'This matches known scam patterns. Block and report immediately.' : isMed ? 'Use caution — verify independently before taking action.' : 'No manipulation tactics detected.',
            tip
        };
    };

    const handleSmsScan = () => {
        if (!smsInput.trim()) { alert('Please paste an SMS to analyze.'); return; }
        setSmsResult({ analyzing: true });
        setTimeout(() => setSmsResult(runOfflineAnalysis(smsInput)), 400);
    };

    const handleChatScan = () => {
        if (!chatInput.trim()) { alert('Please paste a chat message to analyze.'); return; }
        setChatResult({ analyzing: true });
        setTimeout(() => setChatResult(runOfflineAnalysis(chatInput)), 400);
    };

    const ms = getMicStatus();

    return (
        <div className={`page active ${ms.pulsingClass}`} id="page-analyze">
            {ms.pulsingClass && (
                <style>
                    {`
                    .critical-pulse {
                        animation: bgPulse 1.5s infinite alternate !important;
                    }
                    @keyframes bgPulse {
                        from { background-color: var(--bg-u); }
                        to { background-color: rgba(239, 68, 68, 0.15); }
                    }
                    `}
                </style>
            )}

            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>🔍 Analyze a Threat</div>

            <div className="analyzer-tabs">
                <div className={`atab ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>📞 Call</div>
                <div className={`atab ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>💬 SMS</div>
                <div className={`atab ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>🟢 Chat</div>
            </div>

            {/* CALL PANEL */}
            {activeTab === 0 && (
                <div className="atab-panel active">
                    <div className="user-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Live Call Analyzer</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted-u)', marginBottom: '16px' }}>Connect with another device to test scam detection.</div>

                        {!isCallActive && (
                            <input
                                className="scan-input"
                                style={{ textAlign: 'center', marginBottom: '16px', padding: '10px', fontSize: '14px', background: 'var(--bg-u)', border: '1px solid var(--border-u)', borderRadius: '8px', color: 'var(--text-u)' }}
                                value={channelName}
                                onChange={(e) => setChannelName(e.target.value)}
                                placeholder="Enter Room ID (e.g., test-room)"
                            />
                        )}

                        <button
                            className="scan-btn"
                            onClick={toggleCall}
                            style={{ borderRadius: '50px', background: isCallActive ? 'linear-gradient(135deg,#ef4444,#dc2626)' : '' }}
                        >
                            {isCallActive ? '⏹ STOP LISTENING' : '🎙️ START LISTENING'}
                        </button>

                        {isCallActive && (
                            <>
                                <div style={{
                                    marginTop: '16px',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    background: remoteConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: remoteConnected ? 'var(--green-u)' : 'var(--orange-u)',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <div style={{
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: remoteConnected ? 'var(--green-u)' : 'var(--orange-u)',
                                        animation: remoteConnected ? 'none' : 'bgPulse 1s infinite alternate'
                                    }}></div>
                                    {remoteConnected ? 'Connected with User' : 'Waiting for other user to join...'}
                                </div>
                                <div className="mic-wave" style={{ marginTop: '14px' }}>
                                    {Array.from({ length: 9 }).map((_, i) => (
                                        <div key={i} className="mic-bar" style={{ animationDelay: `${Math.abs(4 - i) * 0.1}s` }}></div>
                                    ))}
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontSize: '36px', fontWeight: 800, color: ms.color, transition: 'color 0.3s' }}>{ms.v}%</div>
                                    <div style={{ fontSize: '12px', color: 'var(--muted-u)' }}>SCAM RISK SCORE</div>
                                    <div className="risk-bar-bg">
                                        <div className={`risk-bar-fill ${ms.v > 85 ? 'danger' : ms.v > 60 ? 'warn' : 'safe'}`} style={{ width: `${ms.v}%`, transition: 'width 0.5s ease-out, background 0.3s' }}></div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: ms.color, marginTop: '4px', fontWeight: 600 }}>{ms.lbl}</div>
                                </div>
                                {scamTactics.length > 0 && (
                                    <div className="tactic-chips" style={{ justifyContent: 'center', marginTop: '12px' }}>
                                        {scamTactics.map((t, idx) => (
                                            <div key={idx} className="chip" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red-u)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>{t}</div>
                                        ))}
                                    </div>
                                )}

                                {/* LIVE TRANSCRIPT PANEL */}
                                <div style={{
                                    marginTop: '18px',
                                    textAlign: 'left',
                                    background: 'var(--bg-u)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-u)',
                                    padding: '12px',
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-u)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'bgPulse 1s infinite alternate' }}></span>
                                        LIVE TRANSCRIPT
                                    </div>
                                    {liveTranscripts.length === 0 ? (
                                        <div style={{ fontSize: '12px', color: 'var(--muted-u)', fontStyle: 'italic' }}>
                                            Waiting for speech...
                                        </div>
                                    ) : (
                                        liveTranscripts.map((t, idx) => (
                                            <div key={idx} style={{
                                                marginBottom: '6px',
                                                padding: '6px 8px',
                                                borderRadius: '8px',
                                                background: t.isFinal ? 'rgba(59, 130, 246, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                                fontSize: '12px',
                                                lineHeight: '1.4'
                                            }}>
                                                <span style={{ fontWeight: 700, color: 'var(--blue-u)', marginRight: '6px' }}>
                                                    UID {t.uid}:
                                                </span>
                                                <span style={{ color: t.isFinal ? 'var(--text-u)' : 'var(--muted-u)', fontStyle: t.isFinal ? 'normal' : 'italic' }}>
                                                    {t.text}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                    <div ref={transcriptEndRef} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* SMS PANEL */}
            {activeTab === 1 && (
                <div className="atab-panel active">
                    <div className="user-card">
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Paste the suspicious SMS</div>
                        <textarea className="scan-input" placeholder="e.g. URGENT: Your account blocked..." value={smsInput} onChange={(e) => setSmsInput(e.target.value)}></textarea>
                        <button className="scan-btn" onClick={handleSmsScan}>🔍 CHECK THIS SMS</button>

                        {smsResult && (
                            <div className={`result-card show ${smsResult.analyzing ? '' : (smsResult.isHigh ? 'danger' : smsResult.isMed ? 'warn' : 'safe')}`}>
                                <div className="result-header">
                                    <div className="result-emoji">🚨</div>
                                    <div>
                                        <div className="result-pct" style={{ color: smsResult.isHigh ? 'var(--red-u)' : smsResult.isMed ? 'var(--orange-u)' : 'var(--green-u)' }}>
                                            {smsResult.analyzing ? '--' : `${smsResult.score}%`}
                                        </div>
                                        <div className="result-title">{smsResult.analyzing ? 'Analyzing...' : smsResult.title}</div>
                                        {!smsResult.analyzing && <div className="result-sub">{smsResult.sub}</div>}
                                    </div>
                                </div>
                                {!smsResult.analyzing && (
                                    <>
                                        <div className="risk-bar-bg">
                                            <div className={`risk-bar-fill ${smsResult.isHigh ? 'danger' : smsResult.isMed ? 'warn' : 'safe'}`} style={{ width: `${smsResult.score}%` }}></div>
                                        </div>
                                        <div className="tactic-chips">
                                            {smsResult.found.length > 0 ? smsResult.found.map((f, i) => (
                                                <div key={i} className="chip">{f.t}</div>
                                            )) : (
                                                smsResult.score < 35 && <div className="chip" style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--green-u)', borderColor: 'rgba(34,197,94,0.3)' }}>No threats found</div>
                                            )}
                                        </div>
                                        <div className="tip-box"><strong>Tip:</strong> {smsResult.tip}</div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CHAT PANEL */}
            {activeTab === 2 && (
                <div className="atab-panel active">
                    <div className="user-card">
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>Paste WhatsApp / Chat Message</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted-u)', marginBottom: '10px' }}>Copy any suspicious message and paste it here</div>
                        <textarea className="scan-input" placeholder="e.g. Hello! I'm from Amazon HR..." value={chatInput} onChange={(e) => setChatInput(e.target.value)}></textarea>
                        <button className="scan-btn" onClick={handleChatScan}>🟢 ANALYZE MESSAGE</button>

                        {chatResult && (
                            <div className={`result-card show ${chatResult.analyzing ? '' : (chatResult.isHigh ? 'danger' : chatResult.isMed ? 'warn' : 'safe')}`}>
                                <div className="result-header">
                                    <div className="result-emoji">🚨</div>
                                    <div>
                                        <div className="result-pct" style={{ color: chatResult.isHigh ? 'var(--red-u)' : chatResult.isMed ? 'var(--orange-u)' : 'var(--green-u)' }}>
                                            {chatResult.analyzing ? '--' : `${chatResult.score}%`}
                                        </div>
                                        <div className="result-title">{chatResult.analyzing ? 'Analyzing...' : chatResult.title}</div>
                                    </div>
                                </div>
                                {!chatResult.analyzing && (
                                    <>
                                        <div className="risk-bar-bg">
                                            <div className={`risk-bar-fill ${chatResult.isHigh ? 'danger' : chatResult.isMed ? 'warn' : 'safe'}`} style={{ width: `${chatResult.score}%` }}></div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analyze;
