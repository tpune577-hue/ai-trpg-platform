'use client';

import { useLocalParticipant, useTracks, useParticipantInfo, TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useState, useCallback, useEffect, useRef } from 'react';

// --------------------------------------------------------
// 1. ปุ่ม Push-to-Talk (ดีไซน์ปุ่มใหญ่สำหรับมือถือ)
// --------------------------------------------------------
export function VoicePTTButton() {
    const { localParticipant } = useLocalParticipant();
    const [isTalking, setIsTalking] = useState(false);
    const desiredState = useRef(false);
    const isProcessing = useRef(false);

    // Robust State Reconciliation Loop
    const reconcileMicState = useCallback(async () => {
        if (!localParticipant || isProcessing.current) return;

        // ✅ Check Capability (Safe Guard for HTTP/Mobile)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("❌ getUserMedia is undefined. This usually happens on insecure origins (HTTP).");
            alert("Microphone access requires HTTPS or localhost. Please check your connection.");
            return;
        }

        isProcessing.current = true;
        try {
            // Keep toggling until actual state matches desired state
            while (localParticipant.isMicrophoneEnabled !== desiredState.current) {
                const target = desiredState.current;

                // Extra check before calling setMicrophoneEnabled
                // LiveKit client calls getUserMedia internally
                await localParticipant.setMicrophoneEnabled(target);

                setIsTalking(target);

                if (target && navigator.vibrate) {
                    try { navigator.vibrate(50); } catch (e) { }
                }
            }
        } catch (e) {
            console.error("Mic toggle error:", e);
            // Force UI sync on error
            setIsTalking(localParticipant.isMicrophoneEnabled);

            // Helpful error for user
            if (`${e}`.includes('getUserMedia')) {
                alert("Cannot access microphone. Ensure you are on HTTPS.");
            }
        } finally {
            isProcessing.current = false;
            // If state changed again while processing, retry
            if (localParticipant.isMicrophoneEnabled !== desiredState.current) {
                reconcileMicState();
            }
        }
    }, [localParticipant]);

    const startTalking = useCallback(() => {
        desiredState.current = true;
        reconcileMicState();
    }, [reconcileMicState]);

    const stopTalking = useCallback(() => {
        desiredState.current = false;
        reconcileMicState();
    }, [reconcileMicState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (localParticipant) desiredState.current = false;
        };
    }, []);

    return (
        <div className="relative group flex justify-center items-center">
            {/* Effect วงแหวนกระเพื่อม (แสดงตอนพูด) */}
            {isTalking && (
                <span className="absolute w-full h-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
            )}
            {isTalking && (
                <span className="absolute w-full h-full rounded-full bg-red-500/30 blur-md"></span>
            )}

            {/* ตัวปุ่มหลัก */}
            <button
                className={`
          relative z-10 flex flex-col items-center justify-center 
          h-28 w-28 rounded-full 
          border-4 transition-all duration-200 ease-out
          shadow-xl active:scale-95 touch-manipulation outline-none select-none
          
          ${isTalking
                        ? 'bg-gradient-to-br from-red-600 to-red-800 border-red-400 text-white shadow-red-500/50 scale-105'
                        : 'bg-slate-800/90 border-indigo-500/30 text-indigo-300 hover:border-indigo-400 hover:text-indigo-100 hover:shadow-indigo-500/20'
                    }
        `}
                onMouseDown={startTalking}
                onMouseUp={stopTalking}
                onMouseLeave={stopTalking}
                onTouchStart={(e) => { e.preventDefault(); startTalking() }}
                onTouchEnd={(e) => { e.preventDefault(); stopTalking() }}
                onContextMenu={(e) => e.preventDefault()}
            >
                <span className={`transition-all duration-200 ${isTalking ? 'text-4xl drop-shadow-md' : 'text-3xl opacity-80'}`}>
                    {isTalking ? '🎙️' : '🎤'}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 transition-all ${isTalking ? 'text-red-100' : 'text-indigo-400/70'}`}>
                    {isTalking ? 'ON AIR' : 'HOLD'}
                </span>
            </button>
        </div>
    );
}

// --------------------------------------------------------
// 2. รายชื่อคนพูด (สำหรับวาง Sidebar)
// --------------------------------------------------------
export function ActiveSpeakerList() {
    const tracks = useTracks([Track.Source.Microphone]);

    return (
        <div className="bg-slate-900 border-t border-slate-700 p-2 w-full">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Voice Chat</span>
                <span className="text-[10px] text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Connected
                </span>
            </div>

            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                {tracks.length === 0 && <span className="text-[10px] text-slate-600 italic">No active speakers</span>}
                {tracks.map((ref) => (
                    <SpeakerTile key={ref.publication.trackSid} trackRef={ref} />
                ))}
            </div>
        </div>
    );
}

function SpeakerTile({ trackRef }: { trackRef: TrackReferenceOrPlaceholder }) {
    const { identity, isSpeaking } = useParticipantInfo({ participant: trackRef.participant });
    return (
        <div className={`text-[10px] px-2 py-1 rounded border transition-all duration-200 flex items-center gap-1
      ${isSpeaking
                ? 'border-green-500 bg-green-900/40 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}>
            <span>{isSpeaking ? '🔊' : '👤'}</span>
            <span className="truncate max-w-[80px]">{identity}</span>
        </div>
    );
}