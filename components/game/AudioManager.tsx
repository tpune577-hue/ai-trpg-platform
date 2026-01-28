'use client'

import { useEffect, useRef, useState } from 'react'
import { Howl, Howler } from 'howler'
import { useGameSocket } from '@/hooks/useGameSocket'

export default function AudioManager({ roomCode }: { roomCode: string }) {
    const { onPlayerAction } = useGameSocket(roomCode)
    const bgmRef = useRef<Howl | null>(null)
    const [settings, setSettings] = useState({ master: 1.0, bgm: 0.8, sfx: 1.0 })

    // โหลดค่า Volume จาก LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('rnr_audio_settings')
        if (saved) {
            const parsed = JSON.parse(saved)
            setSettings(parsed)
            Howler.volume(parsed.master) // Set Master Volume Globally
        }
    }, [])

    // Update Volume แบบ Realtime เมื่อค่าเปลี่ยน (จากการกด Setting)
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('rnr_audio_settings')
            if (saved) {
                const parsed = JSON.parse(saved)
                setSettings(parsed)
                Howler.volume(parsed.master)
                if (bgmRef.current) bgmRef.current.volume(parsed.bgm)
            }
        }

        window.addEventListener('audio-settings-changed', handleStorageChange)
        return () => window.removeEventListener('audio-settings-changed', handleStorageChange)
    }, [])

    // ฟังคำสั่งจาก Socket
    useEffect(() => {
        onPlayerAction((action: any) => {
            if (action.actionType === 'PLAY_AUDIO') {
                const { url, type, loop } = action.payload

                if (type === 'BGM') {
                    // หยุดเพลงเก่าก่อน
                    if (bgmRef.current) {
                        bgmRef.current.fade(bgmRef.current.volume(), 0, 1000) // Fade out
                        setTimeout(() => bgmRef.current?.stop(), 1000)
                    }

                    // เล่นเพลงใหม่
                    const sound = new Howl({
                        src: [url],
                        html5: true, // บังคับใช้ HTML5 Audio สำหรับไฟล์ใหญ่ (BGM)
                        loop: loop,
                        volume: 0, // เริ่มที่ 0 แล้ว Fade in
                        onplay: () => {
                            sound.fade(0, settings.bgm, 2000)
                        }
                    })
                    sound.play()
                    bgmRef.current = sound
                } else if (type === 'SFX') {
                    // SFX เล่นซ้อนกันได้เลย ไม่ต้องหยุดอันเก่า
                    const sound = new Howl({
                        src: [url],
                        volume: settings.sfx
                    })
                    sound.play()
                }
            } else if (action.actionType === 'STOP_BGM') {
                if (bgmRef.current) {
                    bgmRef.current.fade(bgmRef.current.volume(), 0, 2000)
                    setTimeout(() => bgmRef.current?.stop(), 2000)
                }
            }
        })
    }, [onPlayerAction, settings])

    return null // ไม่แสดงผลอะไรหน้าจอ
}