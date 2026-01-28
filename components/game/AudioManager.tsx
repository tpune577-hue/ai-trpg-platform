'use client'

import { useEffect, useRef } from 'react'
import { Howl, Howler } from 'howler'
import { useGameSocket } from '@/hooks/useGameSocket'

interface AudioManagerProps {
    roomCode: string
}

export default function AudioManager({ roomCode }: AudioManagerProps) {
    // ใช้ Socket แยกเพื่อให้แน่ใจว่าได้รับ Events แน่นอน
    const { onPlayerAction } = useGameSocket(roomCode, {
        autoConnect: true,
        sessionToken: 'AUDIO_LISTENER'
    })

    const bgmRef = useRef<Howl | null>(null)
    const sfxRef = useRef<Howl | null>(null)

    // ฟังก์ชันช่วย Resume Audio Context (เรียกใช้บ่อยๆ)
    const ensureAudioContext = () => {
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume().then(() => {
                console.log("🔊 AudioContext Resumed by Action!");
            });
        }
    };

    // 1. โหลดค่า Volume
    useEffect(() => {
        const loadVolume = () => {
            const saved = localStorage.getItem('rnr_audio_settings')
            if (saved) {
                const vols = JSON.parse(saved)
                Howler.volume(vols.master)
            }
        }
        loadVolume()
        window.addEventListener('audio-settings-changed', loadVolume)
        return () => window.removeEventListener('audio-settings-changed', loadVolume)
    }, [])

    // 2. Unlock Audio Context (User Gesture)
    useEffect(() => {
        const unlockAudio = () => {
            ensureAudioContext();
            // เอาออกเมื่อทำสำเร็จเพื่อประหยัด resource
            if (Howler.ctx && Howler.ctx.state === 'running') {
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('keydown', unlockAudio);
            }
        }
        document.addEventListener('click', unlockAudio)
        document.addEventListener('keydown', unlockAudio)
        return () => {
            document.removeEventListener('click', unlockAudio)
            document.removeEventListener('keydown', unlockAudio)
        }
    }, [])

    // 3. Listen to Socket Events
    useEffect(() => {
        if (!onPlayerAction) return

        onPlayerAction((action: any) => {
            if (action.actionType !== 'PLAY_AUDIO' && action.actionType !== 'STOP_BGM') return

            console.log("🎵 AudioManager Received:", action.actionType, action.payload)

            // ✅ บังคับ Resume ทุกครั้งที่มีคำสั่งเสียง (แก้เผ็ด Browser)
            ensureAudioContext();

            if (action.actionType === 'STOP_BGM') {
                if (bgmRef.current) {
                    bgmRef.current.fade(bgmRef.current.volume(), 0, 1500)
                    setTimeout(() => bgmRef.current?.stop(), 1500)
                }
                return
            }

            if (action.actionType === 'PLAY_AUDIO') {
                const { url, type, loop } = action.payload

                // ป้องกันเล่นซ้ำเพลงเดิม
                if (type === 'BGM' && bgmRef.current && bgmRef.current.playing()) {
                    // @ts-ignore
                    if (bgmRef.current._src && bgmRef.current._src.includes(url)) {
                        console.log("⚠️ Same BGM playing, ignoring...")
                        return
                    }
                }

                const sound = new Howl({
                    src: [url],
                    html5: true,
                    loop: loop,
                    volume: type === 'BGM' ? 0.8 : 1.0,
                    onloaderror: (id, err) => console.error("❌ Audio Load Error:", err),
                    onplayerror: (id, err) => {
                        console.error("❌ Audio Play Error:", err)
                        ensureAudioContext(); // ลอง Resume อีกทีถ้าพัง
                        sound.once('unlock', () => {
                            sound.play();
                        });
                    }
                })

                if (type === 'BGM') {
                    if (bgmRef.current) {
                        const oldSound = bgmRef.current
                        oldSound.fade(oldSound.volume(), 0, 1000)
                        setTimeout(() => oldSound.stop(), 1000)
                    }
                    bgmRef.current = sound
                    sound.play()
                    sound.fade(0, 0.8, 1000)
                } else {
                    sfxRef.current = sound
                    sound.play()
                }
            }
        })
    }, [onPlayerAction])

    return null
}