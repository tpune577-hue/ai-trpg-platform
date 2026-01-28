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
        sessionToken: 'AUDIO_LISTENER' // แยก Session เพื่อกันชนกับ Board หลัก
    })

    const bgmRef = useRef<Howl | null>(null)
    const sfxRef = useRef<Howl | null>(null)

    // ✅ 1. โหลดค่า Volume ที่บันทึกไว้
    useEffect(() => {
        const loadVolume = () => {
            const saved = localStorage.getItem('rnr_audio_settings')
            if (saved) {
                const vols = JSON.parse(saved)
                Howler.volume(vols.master)
                // เก็บค่าแยกไว้ใช้กับ BGM/SFX ถ้าต้องการ fine-tune
            }
        }
        loadVolume()
        window.addEventListener('audio-settings-changed', loadVolume)
        return () => window.removeEventListener('audio-settings-changed', loadVolume)
    }, [])

    // ✅ 2. Unlock Audio Context (แก้ปัญหาไม่ได้ยินเสียง)
    useEffect(() => {
        const unlockAudio = () => {
            if (Howler.ctx.state === 'suspended') {
                Howler.ctx.resume().then(() => {
                    console.log("🔊 AudioContext Resumed!")
                })
            }
        }
        document.addEventListener('click', unlockAudio)
        document.addEventListener('keydown', unlockAudio)
        return () => {
            document.removeEventListener('click', unlockAudio)
            document.removeEventListener('keydown', unlockAudio)
        }
    }, [])

    // ✅ 3. Listen to Socket Events
    useEffect(() => {
        if (!onPlayerAction) return

        onPlayerAction((action: any) => {
            // กรองเฉพาะ Event เสียง
            if (action.actionType !== 'PLAY_AUDIO' && action.actionType !== 'STOP_BGM') return

            console.log("🎵 AudioManager Received:", action.actionType, action.payload)

            if (action.actionType === 'STOP_BGM') {
                if (bgmRef.current) {
                    bgmRef.current.fade(bgmRef.current.volume(), 0, 1500)
                    setTimeout(() => bgmRef.current?.stop(), 1500)
                }
                return
            }

            if (action.actionType === 'PLAY_AUDIO') {
                const { url, type, loop } = action.payload

                // ป้องกันเล่นซ้ำเพลงเดิม (ถ้าเป็น BGM)
                if (type === 'BGM' && bgmRef.current && bgmRef.current.playing()) {
                    // @ts-ignore - เช็ค src ภายใน Howl
                    if (bgmRef.current._src && bgmRef.current._src.includes(url)) {
                        console.log("⚠️ Same BGM playing, ignoring...")
                        return
                    }
                }

                const sound = new Howl({
                    src: [url],
                    html5: true, // บังคับใช้ HTML5 Audio เพื่อเลี่ยงปัญหา Codec
                    loop: loop,
                    volume: type === 'BGM' ? 0.8 : 1.0, // ค่าเริ่มต้น
                    onloaderror: (id, err) => console.error("❌ Audio Load Error:", err),
                    onplayerror: (id, err) => {
                        console.error("❌ Audio Play Error:", err)
                        // พยายามปลดล็อคอีกรอบ
                        Howler.ctx.resume()
                    }
                })

                // Crossfade Logic for BGM
                if (type === 'BGM') {
                    if (bgmRef.current) {
                        const oldSound = bgmRef.current
                        oldSound.fade(oldSound.volume(), 0, 1000)
                        setTimeout(() => oldSound.stop(), 1000)
                    }
                    bgmRef.current = sound
                    sound.play()
                    sound.fade(0, 0.8, 1000) // Fade In
                } else {
                    // SFX เล่นทับได้เลย แต่เก็บ Ref ไว้ตัวล่าสุด
                    sfxRef.current = sound
                    sound.play()
                }
            }
        })
    }, [onPlayerAction])

    return null // Component นี้ไม่มี UI
}