'use client';

import '@livekit/components-styles';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    ControlBar,
    useTracks,
    useParticipantInfo,
    TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useEffect, useState } from 'react';

interface LobbyVoiceChatProps {
    roomCode: string;
    username: string;
}

export default function LobbyVoiceChat({ roomCode, username }: LobbyVoiceChatProps) {
    const [token, setToken] = useState('');
    const [isConnecting, setIsConnecting] = useState(true);
    const [error, setError] = useState('');

    // Fetch LiveKit token
    useEffect(() => {
        if (!roomCode || !username) return;

        (async () => {
            try {
                setIsConnecting(true);
                setError('');

                // Use lobby-specific room name
                const lobbyRoom = `lobby-${roomCode}`;
                const resp = await fetch(`/api/livekit/token?room=${lobbyRoom}&username=${username}`);

                if (!resp.ok) {
                    throw new Error(`Failed to connect: ${resp.statusText}`);
                }

                const data = await resp.json();
                setToken(data.token);
            } catch (e: any) {
                console.error("Voice Connection Error:", e);
                setError(e.message || 'Failed to connect');
            } finally {
                setIsConnecting(false);
            }
        })();
    }, [roomCode, username]);

    // Loading state
    if (isConnecting) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mt-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span>Connecting to voice chat...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-slate-900/50 border border-red-900 rounded-xl p-4 mt-4">
                <div className="flex items-center gap-2 text-red-400 text-xs">
                    <span>⚠️</span>
                    <span>Voice chat unavailable</span>
                </div>
            </div>
        );
    }

    // No token yet
    if (!token) {
        return null;
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden mt-4">
            <LiveKitRoom
                video={false}
                audio={true}
                token={token}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                data-lk-theme="default"
                style={{ height: 'auto' }}
            >
                <div className="p-4">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">🎙️ Voice Chat</span>
                        </div>
                        <span className="text-[10px] text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                            Connected
                        </span>
                    </div>

                    {/* Active Speakers */}
                    <ActiveSpeakers />

                    {/* Controls */}
                    <div className="mt-3 flex justify-center">
                        <ControlBar
                            variation="minimal"
                            controls={{
                                microphone: true,
                                camera: false,
                                screenShare: false,
                                chat: false,
                                leave: false,
                                settings: false
                            }}
                        />
                    </div>
                </div>

                {/* Audio Renderer (Required) */}
                <RoomAudioRenderer />
            </LiveKitRoom>
        </div>
    );
}

// Active Speakers Component
function ActiveSpeakers() {
    const tracks = useTracks([Track.Source.Microphone]);

    if (tracks.length === 0) {
        return (
            <div className="text-[10px] text-slate-500 italic text-center py-2">
                No one else in voice chat
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {tracks.map((ref) => (
                <SpeakerTile key={ref.publication.trackSid} trackRef={ref} />
            ))}
        </div>
    );
}

// Speaker Tile Component
function SpeakerTile({ trackRef }: { trackRef: TrackReferenceOrPlaceholder }) {
    const { identity } = useParticipantInfo({ participant: trackRef.participant });
    const isSpeaking = false; // Placeholder - can be enhanced later

    return (
        <div
            className={`text-[10px] px-2 py-1 rounded border transition-all duration-200 flex items-center gap-1
                ${isSpeaking
                    ? 'border-green-500 bg-green-900/40 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
        >
            <span>{isSpeaking ? '🔊' : '👤'}</span>
            <span className="truncate max-w-[80px]">{identity}</span>
        </div>
    );
}
