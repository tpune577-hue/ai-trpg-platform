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

interface VoicePanelProps {
    room: string;
    username: string;
}

export default function VoicePanel({ room, username }: VoicePanelProps) {
    const [token, setToken] = useState('');

    // 1. ขอ Token จาก Server เมื่อเข้าห้อง
    useEffect(() => {
        if (!room || !username) return;

        (async () => {
            try {
                const resp = await fetch(`/api/livekit/token?room=${room}&username=${username}`);

                if (!resp.ok) {
                    console.error("Failed to fetch token:", resp.status, resp.statusText);
                    return;
                }

                const data = await resp.json();
                setToken(data.token);
            } catch (e) {
                console.error("Voice Connection Error:", e);
            }
        })();
    }, [room, username]);

    if (token === '') {
        return <div className="text-xs text-slate-500 animate-pulse p-2">Connecting Voice...</div>;
    }

    return (
        <LiveKitRoom
            video={false} // ไม่ใช้วิดีโอ
            audio={true}  // ใช้เสียง
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            data-lk-theme="default"
            style={{ height: 'auto' }} // ปรับความสูงให้พอดี
        >
            {/* ส่วนแสดงผลเสียง */}
            <div className="bg-slate-900 border-t border-slate-700 p-2">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Voice Chat</span>
                    <span className="text-[10px] text-green-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Connected
                    </span>
                </div>

                {/* รายชื่อคนในห้อง */}
                <ActiveSpeakers />

                {/* ปุ่มควบคุม (Mute/Unmute) */}
                <div className="mt-2 flex justify-center">
                    <ControlBar
                        variation="minimal"
                        controls={{ microphone: true, camera: false, screenShare: false, chat: false, leave: false, settings: false }}
                    />
                </div>
            </div>

            {/* ตัวเล่นเสียง (สำคัญมาก ห้ามลบ) */}
            <RoomAudioRenderer />
        </LiveKitRoom>
    );
}

// Component ย่อย: แสดงรายชื่อคนพูด
function ActiveSpeakers() {
    // ดึง Track เสียงทั้งหมดในห้อง
    const tracks = useTracks([Track.Source.Microphone]);

    if (tracks.length === 0) return <div className="text-[10px] text-slate-600 italic">No one else is here.</div>;

    return (
        <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto custom-scrollbar">
            {tracks.map((ref) => (
                <SpeakerTile key={ref.publication.trackSid} trackRef={ref} />
            ))}
        </div>
    );
}

// Component ย่อย: กล่องชื่อคน (เปลี่ยนสีตอนพูด)
function SpeakerTile({ trackRef }: { trackRef: TrackReferenceOrPlaceholder }) {
    const { identity } = useParticipantInfo({ participant: trackRef.participant });
    // Note: isSpeaking is not available from useParticipantInfo in this version
    const isSpeaking = false; // Placeholder - can be enhanced with useIsSpeaking hook if needed
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