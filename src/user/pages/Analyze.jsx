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
    const [selectedLanguage, setSelectedLanguage] = useState(null);

    // Global Context
    const { isCallActive, riskScore, scamTactics, ollamaReasoning, startAnalysis, stopAnalysis, addTranscriptChunk, transcriptHistory } = useScamContext();

    // UI state
    const [reportingStatus, setReportingStatus] = useState(null); // 'sending' | 'success' | 'error'

    // Call state
    const [channelName, setChannelName] = useState('demo-room-1');
    const [remoteConnected, setRemoteConnected] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const agoraClient = useRef(null);
    const localAudioTrack = useRef(null);
    const currentAgentId = useRef(null);
    const myUidRef = useRef(null);
    const localSpeechRecognizer = useRef(null);
    const isCallActiveRef = useRef(false);
    
    // Chunking Buffer
    const chunkTimerRef = useRef(null);

    const [liveTranscripts, setLiveTranscripts] = useState([]);
    const transcriptEndRef = useRef(null);
    const humanJoinOrder = useRef([]); // Track UIDs of human users in order

    // Refs for dynamically accessing latest context state inside closures
    const riskScoreRef = useRef(riskScore);
    const ollamaReasoningRef = useRef(ollamaReasoning);
    const transcriptHistoryRef = useRef(transcriptHistory);
    const hasSavedConvoRef = useRef(false);

    // MediaRecorder — captures local+remote audio mix for voice pipeline
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const [voiceProcessing, setVoiceProcessing] = useState(null); // 'processing' | 'done' | 'error'
    const [voiceResult, setVoiceResult] = useState(null);

    // Sticky UI for reporting — once risk > 70%, it stays visible
    const [stickyReportOption, setStickyReportOption] = useState(false);

    useEffect(() => {
        if (riskScore > 70 && !stickyReportOption) {
            setStickyReportOption(true);
        }
    }, [riskScore, stickyReportOption]);

    useEffect(() => {
        riskScoreRef.current = riskScore;
        ollamaReasoningRef.current = ollamaReasoning;
        transcriptHistoryRef.current = transcriptHistory;
    }, [riskScore, ollamaReasoning, transcriptHistory]);

    const autoSaveConversationToMongo = () => {
        if (hasSavedConvoRef.current) return; // Prevent duplicate saves for the same conversation
        
        const history = transcriptHistoryRef.current;
        if (history.length > 0) {
            hasSavedConvoRef.current = true;
            fetch('/api/analyze/store_conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: channelName,
                    transcript: history.map(t => `${t.speaker}: ${t.text}`).join('\n'),
                    riskScore: riskScoreRef.current,
                    reasoning: ollamaReasoningRef.current
                })
            }).then(() => console.log("✅ Convo Auto-Saved to MongoDB since a user left!"))
            .catch(e => console.error("Failed to Auto-Save conversation", e));
        }
    };

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

    // Timer effect
    useEffect(() => {
        let interval;
        if (remoteConnected && isCallActive) {
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => clearInterval(interval);
    }, [remoteConnected, isCallActive]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

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

        // 📝 Role determination: First joiner = Scammer, Second joiner = Victim
        if (!humanJoinOrder.current.includes(Number(uid)) && Number(uid) < 10000 && Number(uid) !== STT_SUB_BOT_UID && Number(uid) !== STT_PUB_BOT_UID) {
            humanJoinOrder.current.push(Number(uid));
        }

        const isMe = myUidRef.current && Number(uid) === Number(myUidRef.current);
        
        // Let the highly accurate native Web Speech API handle the local transcript
        if (isMe) {
            return;
        }

        const roleIndex = humanJoinOrder.current.indexOf(Number(uid));
        
        let roleLabel = "Unknown";
        if (roleIndex === 0) roleLabel = "SCAMMER";
        else if (roleIndex === 1) roleLabel = "VICTIM";
        else roleLabel = `User ${uid}`;

        console.log(`[STT] 📝 ${roleLabel} (UID ${uid}): "${text}" (final: ${isFinal})`);

        const speakerLabel = roleLabel;
        const entry = {
            role: speakerLabel,
            text: text.trim(),
            isFinal,
            timestamp: Date.now()
        };

        setLiveTranscripts(prev => {
            if (!isFinal) {
                const lastIdx = prev.findLastIndex(t => t.role === speakerLabel && !t.isFinal);
                if (lastIdx >= 0) {
                    const updated = [...prev];
                    updated[lastIdx] = entry;
                    return updated;
                }
            }
            return [...prev, entry];
        });

        // If this is a final transcript, add it to our frontend history
        if (isFinal && text.trim().length > 2) {
            addTranscriptChunk(speakerLabel, text.trim());
        }
    };

    const joinCall = async () => {
        try {
            const myUid = Math.floor(Math.random() * 8000) + 2000; // 2000-9999 (Avoid bot UIDs)
            myUidRef.current = myUid;
            humanJoinOrder.current = []; // Reset join order
            hasSavedConvoRef.current = false; // Reset save tracker for new call

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
                console.log(`[Agora] 📡 user-published: UID ${user.uid}, type: ${mediaType}`);
                try {
                    await agoraClient.current.subscribe(user, mediaType);
                    console.log(`[Agora] ✅ Subscribed to UID ${user.uid} (${mediaType})`);
                    
                    if (mediaType === "audio") {
                        // Don't play audio from STT bots
                        if (user.uid !== STT_SUB_BOT_UID && user.uid !== STT_PUB_BOT_UID) {
                            // Ensure audio is played, handle autoplay blocks
                            const playAudio = async () => {
                                try {
                                    await user.audioTrack.play();
                                    console.log(`[Agora] 🔊 Playing audio from human user ${user.uid}`);
                                } catch (err) {
                                    console.error(`[Agora] ❌ Autoplay blocked for UID ${user.uid}. Need user gesture.`, err);
                                    // Fallback: try to play again on any click
                                    window.addEventListener('click', () => {
                                        user.audioTrack.play().catch(e => console.error("Manual play failed:", e));
                                    }, { once: true });
                                }
                            };
                            
                            playAudio();
                            
                            // Track human join order for remote users
                            if (!humanJoinOrder.current.includes(user.uid)) {
                                humanJoinOrder.current.push(user.uid);
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[Agora] ❌ Failed to subscribe to UID ${user.uid}:`, e);
                }
            });

            agoraClient.current.on("user-joined", (user) => {
                console.log(`[Agora] 👤 user-joined: UID ${user.uid}`);
                // Ignore the STT bots for the UI indicator
                if (user.uid !== STT_SUB_BOT_UID && user.uid !== STT_PUB_BOT_UID) {
                    setRemoteConnected(true);
                    console.log(`[Agora] ✅ Human user ${user.uid} is now visible in UI`);
                } else {
                    console.log(`[Agora] 🤖 STT Bot ${user.uid} joined the channel`);
                }
            });

            agoraClient.current.on("user-left", (user) => {
                console.log(`[Agora] 🚪 user-left: UID ${user.uid}`);
                if (user.uid !== STT_SUB_BOT_UID && user.uid !== STT_PUB_BOT_UID) {
                    // A human user left the room -> Conversation effectively ended
                    autoSaveConversationToMongo();

                    // Only disconnect if there are no other humans left
                    const humans = agoraClient.current.remoteUsers.filter(u => u.uid !== STT_SUB_BOT_UID && u.uid !== STT_PUB_BOT_UID);
                    if (humans.length === 0) {
                        setRemoteConnected(false);
                        console.log(`[Agora] ❌ Last human user ${user.uid} left the channel. Remote disconnected.`);
                    } else {
                        console.log(`[Agora] ℹ️ Human user ${user.uid} left, but ${humans.length} other human(s) remain.`);
                    }
                } else {
                    console.log(`[Agora] 🤖 STT Bot ${user.uid} left the channel`);
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
                console.log(`🎤 Attempting to join '${channelName}' as UID ${myUid}...`);
                const uid = await agoraClient.current.join(appId, channelName, token, myUid);
                console.log(`🎤 SUCCESS: Joined channel '${channelName}' with UID ${uid}`);
                
                // Track our own join order
                if (!humanJoinOrder.current.includes(uid)) {
                    humanJoinOrder.current.push(uid);
                }

                // Check for existing human users
                const existingUsers = agoraClient.current.remoteUsers;
                const hasHuman = existingUsers.some(u => u.uid !== STT_SUB_BOT_UID && u.uid !== STT_PUB_BOT_UID);
                if (hasHuman) {
                    console.log("[Agora] 👥 Found existing human users in room");
                    setRemoteConnected(true);
                }
            } else {
                console.error("❌ ABORT: No Agora App ID provided.");
                alert("Agora App ID is missing. Check your configuration.");
                return;
            }

            // 4. Create and publish local mic
            localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack();
            if (appId) {
                console.log(`[Agora] 🎙️ Publishing local audio track for UID ${myUidRef.current}`);
                await agoraClient.current.publish([localAudioTrack.current]);
            }

            // 4.5. Start MediaRecorder to capture call audio for voice pipeline
            try {
                const micStream = localAudioTrack.current.getMediaStreamTrack();
                const audioContext = new AudioContext();
                const dest = audioContext.createMediaStreamDestination();

                // Mix local mic
                const localSource = audioContext.createMediaStreamSource(new MediaStream([micStream]));
                localSource.connect(dest);

                // We'll also capture remote audio when it arrives
                const connectRemoteAudio = () => {
                    if (!agoraClient.current) return;
                    agoraClient.current.remoteUsers.forEach(user => {
                        if (user.audioTrack && user.uid !== STT_SUB_BOT_UID && user.uid !== STT_PUB_BOT_UID) {
                            try {
                                const remoteTrack = user.audioTrack.getMediaStreamTrack();
                                const remoteSource = audioContext.createMediaStreamSource(new MediaStream([remoteTrack]));
                                remoteSource.connect(dest);
                                console.log(`[Recorder] 🎙️ Mixed remote UID ${user.uid} into recording`);
                            } catch (e) {
                                console.warn(`[Recorder] Failed to mix remote UID ${user.uid}:`, e);
                            }
                        }
                    });
                };

                // Connect existing remote users and set up listener for new ones
                connectRemoteAudio();
                const remoteInterval = setInterval(connectRemoteAudio, 2000);

                recordedChunksRef.current = [];
                const recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus' });
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) recordedChunksRef.current.push(e.data);
                };
                recorder.onstop = () => {
                    clearInterval(remoteInterval);
                    audioContext.close().catch(() => {});
                };
                recorder.start(1000); // Collect chunks every second
                mediaRecorderRef.current = recorder;
                console.log('[Recorder] 🔴 MediaRecorder started — capturing call audio');
            } catch (recErr) {
                console.warn('[Recorder] MediaRecorder setup failed (non-fatal):', recErr);
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

            // 6. Setup High Accuracy Local STT via Web Speech API
            isCallActiveRef.current = true;
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognizer = new SpeechRecognition();
                recognizer.continuous = true;
                recognizer.interimResults = true;
                recognizer.lang = selectedLanguage === 'ta' ? 'ta-IN' : 'en-US';

                recognizer.onresult = (event) => {
                    let interimText = '';
                    let finalText = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalText += event.results[i][0].transcript;
                        } else {
                            interimText += event.results[i][0].transcript;
                        }
                    }

                    const roleLabel = "YOU";
                    const mergedText = (finalText + " " + interimText).trim();
                    if (!mergedText) return;

                    const entry = {
                        role: roleLabel,
                        text: mergedText,
                        isFinal: !!finalText,
                        timestamp: Date.now()
                    };

                    setLiveTranscripts(prev => {
                        const lastIdx = prev.findLastIndex(t => t.role === roleLabel && !t.isFinal);
                        if (lastIdx >= 0) {
                            const updated = [...prev];
                            updated[lastIdx] = entry;
                            return updated;
                        }
                        return [...prev, entry];
                    });

                    if (finalText.trim().length > 2) {
                        console.log(`[Local STT] 📝 YOU: "${finalText.trim()}" (final: true)`);
                        addTranscriptChunk(roleLabel, finalText.trim());
                    }
                };
                
                recognizer.onend = () => {
                    if (isCallActiveRef.current) {
                        try { recognizer.start(); } catch(e){}
                    }
                };

                try {
                    recognizer.start();
                    localSpeechRecognizer.current = recognizer;
                    console.log("[Local STT] High-Accuracy Web Speech API started.");
                } catch(e) { console.warn("Failed to start speech rec", e); }
            }

            // 7. Start our local Context
            startAnalysis(channelName);
            setLiveTranscripts([]);

            // 8. LIVE CHUNKING LOOP (Every 3 seconds)
            chunkTimerRef.current = setInterval(() => {
                // To get cummulative scam score over time, we send the entire transcript history
                // mapped over the last 3-second window's context.
                // NOTE: Using functional state to get the freshest context data
                setLiveTranscripts((currentTranscripts) => {
                    // Extract all final texts joined together
                    const validTexts = currentTranscripts
                        .filter(t => t.isFinal)
                        .map(t => t.text)
                        .join(" ");

                    if (validTexts.length > 5) {
                        fetch('/api/analyze', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                channelId: channelName,
                                speakerId: "ALL",
                                text: validTexts
                            })
                        }).catch(err => console.error('[3s Chunk] Analysis failed:', err));
                    }
                    return currentTranscripts;
                });
            }, 3000);

        } catch (error) {
            console.error("Error joining call:", error);
            startAnalysis(channelName);
        }
    };

    const leaveCall = async () => {
        setRemoteConnected(false);
        isCallActiveRef.current = false;

        // Stop MediaRecorder if active
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
                console.log('[Recorder] ⏹ MediaRecorder stopped');
            } catch (e) {
                console.warn('[Recorder] Stop error:', e);
            }
        }
        
        if (localSpeechRecognizer.current) {
            try { localSpeechRecognizer.current.stop(); } catch(e){}
            localSpeechRecognizer.current = null;
        }

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

        if (chunkTimerRef.current) {
            clearInterval(chunkTimerRef.current);
            chunkTimerRef.current = null;
        }

        // Trigger auto-save if the local user is the one explicitly ending the call
        autoSaveConversationToMongo();

        stopAnalysis();
        setReportingStatus(null);
        setStickyReportOption(false);
    };

    const handleReport = async () => {
        setReportingStatus('sending');
        try {
            // Guarantee the conversation is saved to MongoDB upon manual reporting
            autoSaveConversationToMongo();

            // Ensure case ID is persistent for both audio and case record
            const caseId = `CYB-${Date.now()}`;
            const fullTranscript = transcriptHistory.map(t => `${t.speaker}: ${t.text}`).join('\n');

            // 1. Prepare common case data
            const formData = new FormData();
            formData.append('case_id', caseId);
            formData.append('user_id', `VICTIM-${myUidRef.current || '777'}`);
            formData.append('call_id', channelName);
            formData.append('scam_type', scamTactics.length > 0 ? scamTactics[0] : 'Unknown');
            formData.append('risk_score', String(riskScore));
            formData.append('tactics', scamTactics.join(','));
            formData.append('city', 'Chennai'); // For demo; replace with real location if available
            formData.append('district', 'Chennai');
            formData.append('transcript', fullTranscript);
            formData.append('summary', ollamaReasoning || '');
            formData.append('channel_id', channelName);

            // 2. Attach audio if recording is available
            if (recordedChunksRef.current.length > 0) {
                const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm;codecs=opus' });
                formData.append('audio', audioBlob, `${caseId}.webm`);
                setVoiceProcessing('processing');
            }

            // 3. Send single request to the voice recording/case management pipeline
            const response = await fetch('/api/voice/process', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setReportingStatus('success');
                setTimeout(() => setReportingStatus(null), 3000);

                if (data.success) {
                    setVoiceResult(data.result);
                    setVoiceProcessing('done');
                    console.log('✅ Voice/Case pipeline success:', data.result.verdict);
                } else {
                    setVoiceProcessing('error');
                }
            } else {
                setReportingStatus('error');
            }
        } catch (error) {
            console.error('Reporting error:', error);
            setReportingStatus('error');
        }
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
        const lbl = v > 70 ? '🚨 CRITICAL RISK — Scam Detected!' : v > 60 ? '⚠️ HIGH RISK — Likely scam call!' : v > 35 ? '⚠️ Suspicious patterns detected' : '🔍 Listening for scam keywords...';
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
        <div className={`page active ${ms.pulsingClass}`} id="page-analyze" style={{ padding: isCallActive ? '0' : '20px 16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
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

            {isCallActive ? (
                /* iOS Active Call Screen Design */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-u)', paddingTop: 'max(env(safe-area-inset-top), 40px)', paddingBottom: 'max(env(safe-area-inset-bottom), 20px)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, overflowY: 'auto' }}>

                    {/* Top: Avatar & Caller Info */}
                    <div style={{ textAlign: 'center', width: '100%', marginTop: '10px' }}>
                        <div style={{ width: '90px', height: '90px', margin: '0 auto 12px', borderRadius: '50%', background: "linear-gradient(135deg, #4b5563, #1f2937)", display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: 'rgba(255,255,255,0.4)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                            ?
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: 300, color: 'var(--text-u)', marginBottom: '4px' }}>Unknown Caller</h1>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px', color: remoteConnected ? 'var(--green-u)' : 'var(--muted-u)' }}>
                            {remoteConnected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green-u)', animation: 'bgPulse 1.5s infinite alternate' }}></div>}
                            {remoteConnected ? formatTime(callDuration) : 'Connecting...'}
                        </div>
                    </div>

                    {/* Middle: Analysis / Transcript */}
                    <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>

                        {/* Status (Apple call 'Grid' equivalent) */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ fontSize: '56px', fontWeight: 200, color: ms.color, lineHeight: 1 }}>{ms.v}%</div>
                            <div style={{ fontSize: '12px', color: 'var(--muted-u)', marginTop: '8px', marginBottom: '8px', letterSpacing: '0.5px' }}>SCAM RISK SCORE</div>
                            <div style={{ fontSize: '16px', fontWeight: 500, color: ms.color, textAlign: 'center' }}>{ms.lbl}</div>
                        </div>

                        {scamTactics.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                                {scamTactics.map((t, idx) => (
                                    <div key={idx} style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--red-u)', fontSize: '12px', fontWeight: 500, borderRadius: '24px' }}>
                                        {t}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Ollama + Pinecone Deep Analysis Context */}
                        <div style={{
                            width: '100%', maxWidth: '360px', background: 'rgba(79, 142, 255, 0.1)',
                            borderRadius: '16px', padding: '12px', marginBottom: '16px',
                            border: '1px solid rgba(79, 142, 255, 0.3)', position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--blue-u)', letterSpacing: '1px', marginBottom: '4px' }}>
                                🧠 SCAM CONTEXT
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-u)', lineHeight: '1.4' }}>
                                {ollamaReasoning}
                            </div>
                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 8px', fontSize: '10px', background: 'rgba(79, 142, 255, 0.2)', color: 'var(--blue-u)', borderBottomLeftRadius: '8px' }}>
                                HYBRID ENGINE
                            </div>
                        </div>

                        <div style={{
                            width: '100%', maxWidth: '360px', background: 'rgba(28, 28, 30, 0.6)',
                            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: '24px', padding: '16px', minHeight: '120px', maxHeight: '180px',
                            overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-u)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
                                Live Transcript
                            </div>
                            {liveTranscripts.length === 0 ? (
                                <div style={{ fontSize: '14px', color: 'var(--muted-u)', fontStyle: 'italic', textAlign: 'center', marginTop: '10px' }}>
                                    Listening...
                                </div>
                            ) : (
                                liveTranscripts.map((t, idx) => (
                                    <div key={idx} style={{ marginBottom: '10px', fontSize: '16px', lineHeight: '1.4', color: t.isFinal ? 'var(--text-u)' : 'rgba(255,255,255,0.6)' }}>
                                        <span style={{ 
                                            fontWeight: 700, 
                                            fontSize: '11px',
                                            color: t.role === 'SCAMMER' ? 'var(--red-u)' : 'var(--green-u)', 
                                            marginRight: '8px',
                                            background: t.role === 'SCAMMER' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase'
                                        }}>{t.role}:</span>
                                        {t.text}
                                    </div>
                                ))
                            )}
                            <div ref={transcriptEndRef} />
                        </div>
                    </div>

                    {/* Report and Voice Processing Status (Moved Up) */}
                    {stickyReportOption && (
                        <button
                            onClick={handleReport}
                            disabled={reportingStatus === 'sending'}
                            style={{
                                marginBottom: '12px', width: '100%', maxWidth: '280px', padding: '14px',
                                borderRadius: '16px', border: 'none', cursor: 'pointer',
                                background: reportingStatus === 'success' ? 'var(--green-u)' : 'rgba(255,255,255,0.1)',
                                color: 'white', fontWeight: 800, fontSize: '13px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: reportingStatus === 'sending' ? 'inset 0 0 10px rgba(0,0,0,0.5)' : 'none',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            {reportingStatus === 'sending' ? (
                                <>
                                    <span className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                                    SECURE FILING...
                                </>
                            ) : reportingStatus === 'success' ? (
                                "✅ FILED TO CYBERCRIME"
                            ) : (
                                "🚨 REPORT TO POLICE"
                            )}
                        </button>
                    )}

                    {voiceProcessing && (
                        <div style={{
                            marginBottom: '16px', width: '100%', maxWidth: '280px',
                            padding: '12px', borderRadius: '14px',
                            background: voiceProcessing === 'done'
                                ? (voiceResult?.matched ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)')
                                : 'rgba(79, 142, 255, 0.15)',
                            border: `1px solid ${voiceProcessing === 'done'
                                ? (voiceResult?.matched ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)')
                                : 'rgba(79, 142, 255, 0.4)'}`,
                            textAlign: 'center',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px',
                                color: voiceProcessing === 'done'
                                    ? (voiceResult?.matched ? 'var(--red-u)' : 'var(--green-u)')
                                    : 'var(--blue-u)'
                            }}>
                                🔊 VOICEPRINT ANALYSIS
                            </div>
                            {voiceProcessing === 'processing' && (
                                <div style={{ fontSize: '12px', color: 'var(--blue-u)' }}>
                                    Extracting voice fingerprint...
                                </div>
                            )}
                            {voiceProcessing === 'done' && voiceResult && (
                                <div style={{ fontSize: '13px', fontWeight: 700,
                                    color: voiceResult.matched ? 'var(--red-u)' : 'var(--green-u)'
                                }}>
                                    {voiceResult.verdict}
                                    {voiceResult.confidence && ` — ${voiceResult.confidence}`}
                                    {voiceResult.victim_count > 1 && ` · ${voiceResult.victim_count} victims`}
                                </div>
                            )}
                            {voiceProcessing === 'error' && (
                                <div style={{ fontSize: '12px', color: 'var(--orange-u)' }}>
                                    Voice processing unavailable
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bottom: End Call Button */}
                    <div style={{ paddingBottom: '30px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <button
                            style={{ background: '#ff3b30', width: '76px', height: '76px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)' }}
                            onClick={toggleCall}
                        >
                            <span style={{ fontSize: '36px', color: 'white', transform: 'rotate(135deg)', display: 'inline-block' }}>📞</span>
                        </button>
                    </div>
                </div>
            ) : (
                /* NORMAL TABS UI */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
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

                                {!selectedLanguage ? (
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Choose your preferred language / உங்களுக்கு விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்:</div>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                            <button className="scan-btn" style={{ width: 'auto', padding: '10px 20px', margin: 0 }} onClick={() => setSelectedLanguage('en')}>English</button>
                                            <button className="scan-btn" style={{ width: 'auto', padding: '10px 20px', margin: 0 }} onClick={() => setSelectedLanguage('ta')}>தமிழ் (Tamil)</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '13px', background: 'rgba(79, 142, 255, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', color: 'var(--blue-u)', border: '1px solid rgba(79,142,255,0.3)' }}>
                                            {selectedLanguage === 'en' ? "Instructions: Enter a room ID, click Start Listening, and talk clearly. The AI will analyze the live call for scams." : "வழிமுறைகள்: அறை ஐடியை உள்ளிடவும், Start Listening என்பதை கிளிக் செய்து, தெளிவாகப் பேசவும். நேரடியாக மோசடிகளை AI பகுப்பாய்வு செய்யும்."}
                                        </div>
                                        <input
                                            className="scan-input"
                                            style={{ textAlign: 'center', marginBottom: '16px', padding: '10px', fontSize: '14px', background: 'var(--bg-u)', border: '1px solid var(--border-u)', borderRadius: '8px', color: 'var(--text-u)' }}
                                            value={channelName}
                                            onChange={(e) => setChannelName(e.target.value)}
                                            placeholder="Enter Room ID (e.g., test-room)"
                                        />
                                        <button className="scan-btn" onClick={toggleCall} style={{ borderRadius: '50px' }}>
                                            🎙️ START LISTENING
                                        </button>
                                        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted-u)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setSelectedLanguage(null)}>
                                            Change Language / மொழியை மாற்று
                                        </div>
                                    </div>
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
            )}
        </div>
    );
};

export default Analyze;
