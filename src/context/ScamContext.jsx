import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const ScamContext = createContext(null);

export const ScamProvider = ({ children }) => {
    const [isCallActive, setIsCallActive] = useState(false);
    const [currentChannel, setCurrentChannel] = useState(null);

    // Real-time analysis metrics
    const [riskScore, setRiskScore] = useState(0);
    const [scamTactics, setScamTactics] = useState([]);
    const [vulnerability, setVulnerability] = useState('LOW');

    // Array of { speaker: 'local' | 'remote', text: string, timestamp: number }
    const [transcriptHistory, setTranscriptHistory] = useState([]);

    const ws = useRef(null);

    // Connect to backend WebSocket for real-time risk updates
    useEffect(() => {
        if (isCallActive && currentChannel) {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws.current = new WebSocket(`${wsProtocol}//${window.location.host}/ws/monitor/${currentChannel}`);

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'RISK_UPDATE') {
                        setRiskScore(data.data.risk_score);
                        setScamTactics(data.data.tactics);
                        setVulnerability(data.data.vulnerability);

                        if (data.data.trigger_golden_minute) {
                            triggerAlert();
                        }
                    }
                } catch (error) {
                    console.error("Failed to parse WS message", error);
                }
            };

            ws.current.onerror = (error) => {
                console.error("ScamContext WebSocket Error:", error);
            };

            return () => {
                if (ws.current) {
                    ws.current.close();
                }
            };
        }
    }, [isCallActive, currentChannel]);

    const triggerAlert = useCallback(() => {
        // Attempt device vibration
        if (navigator.vibrate) {
            navigator.vibrate([500, 200, 500]);
        }
    }, []);

    const addTranscriptChunk = useCallback((speaker, text) => {
        setTranscriptHistory(prev => [...prev, {
            speaker,
            text,
            timestamp: Date.now()
        }]);
    }, []);

    const startAnalysis = useCallback((channel) => {
        setCurrentChannel(channel);
        setIsCallActive(true);
        setTranscriptHistory([]);
        setRiskScore(0);
        setScamTactics([]);
        setVulnerability('LOW');
    }, []);

    const stopAnalysis = useCallback(() => {
        setIsCallActive(false);
        setCurrentChannel(null);
    }, []);

    const value = {
        isCallActive,
        currentChannel,
        riskScore,
        scamTactics,
        vulnerability,
        transcriptHistory,
        addTranscriptChunk,
        startAnalysis,
        stopAnalysis
    };

    return (
        <ScamContext.Provider value={value}>
            {children}
        </ScamContext.Provider>
    );
};

export const useScamContext = () => {
    const context = useContext(ScamContext);
    if (!context) {
        throw new Error('useScamContext must be used within a ScamProvider');
    }
    return context;
};
