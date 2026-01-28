'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useGameSocket } from '@/hooks/useGameSocket'
import { getLobbyInfo, getLobbyAssets, updateGameSessionState, kickPlayer, pauseGameSession, endGameSession, updateCharacterStats, updatePlayerInventory } from '@/app/actions/game'
import { addCustomAsset } from '@/app/actions/quick-add'

// Components
import VoicePanel from '@/components/game/VoicePanel'
import ImageUploader from '@/components/shared/ImageUploader'
import { GameLog } from '@/components/board/GameLog'
import { SceneDisplay } from '@/components/board/SceneDisplay'
import { EnhancedPartyStatus } from '@/components/board/EnhancedPartyStatus'
import { DiceResultOverlay } from '@/components/board/DiceResultOverlay'
// ✅ Import Audio Components
import AudioManager from '@/components/game/AudioManager'
import SettingsModal from '@/components/game/SettingsModal'

// Utils
import { rollD4RnR } from '@/lib/rnr-dice'

export default function CampaignBoardPage() {
    const params = useParams()
    const router = useRouter()
    const joinCode = params.code as string

    // --- DATA STATE ---
    const [session, setSession] = useState<any>(null)
    const [campaignScenes, setCampaignScenes] = useState<any[]>([])
    const [campaignNpcs, setCampaignNpcs] = useState<any[]>([])
    // ✅ เพิ่ม State สำหรับ Audio
    const [audioTracks, setAudioTracks] = useState<any[]>([])
    const [currentTrack, setCurrentTrack] = useState<string | null>(null) // ✅ เพิ่ม State นี้เพื่อแก้ Error

    const [customScenes, setCustomScenes] = useState<any[]>([])
    const [customNpcs, setCustomNpcs] = useState<any[]>([])
    const [dbPlayers, setDbPlayers] = useState<any[]>([])
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [isLoadingAssets, setIsLoadingAssets] = useState(true)
    const [myIdentity, setMyIdentity] = useState<string>('')
    const [playerInventories, setPlayerInventories] = useState<Record<string, any[]>>({})

    // --- GAME STATE ---
    const [gameState, setGameState] = useState<any>({
        currentScene: null,
        sceneImageUrl: '',
        activeNpcs: []
    })
    const [logs, setLogs] = useState<any[]>([])
    const [gmNarration, setGmNarration] = useState<string>('')

    // --- UI STATE ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    // ✅ เพิ่ม Tab AUDIO
    const [activeTab, setActiveTab] = useState<'SCENE' | 'NPC' | 'PARTY' | 'AUDIO' | 'NOTE' | 'STORY'>('PARTY')
    const [gmInput, setGmInput] = useState('')
    const [targetDC, setTargetDC] = useState(15)

    // ✅ Settings Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    // RESIZE STATE
    const [sceneHeightPercent, setSceneHeightPercent] = useState(60)
    const [isResizing, setIsResizing] = useState(false)
    const boardRef = useRef<HTMLDivElement>(null)

    // Quick Add Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [addModalType, setAddModalType] = useState<'SCENE' | 'NPC'>('SCENE')
    const [newItemName, setNewItemName] = useState('')
    const [newItemUrl, setNewItemUrl] = useState('')
    const [isAddingItem, setIsAddingItem] = useState(false)

    // AI State
    const [isAiLoading, setIsAiLoading] = useState(false)

    // Animation State
    const [showingDiceResult, setShowingDiceResult] = useState<any>(null)
    const [diceResult, setDiceResult] = useState<any>(null)
    const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Note & Task State
    const [gmNotes, setGmNotes] = useState('')
    const [tasks, setTasks] = useState<{ id: number, text: string, done: boolean }[]>([])
    const [newTask, setNewTask] = useState('')

    // --- HELPER FUNCTIONS ---
    const addTask = () => {
        if (!newTask.trim()) return
        setTasks(prev => [...prev, { id: Date.now(), text: newTask, done: false }])
        setNewTask('')
    }
    const toggleTask = (id: number) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
    }
    const removeTask = (id: number) => {
        setTasks(prev => prev.filter(t => t.id !== id))
    }

    // Load LocalStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedNotes = localStorage.getItem(`gm_notes_${joinCode}`)
            const savedTasks = localStorage.getItem(`gm_tasks_${joinCode}`)
            if (savedNotes) setGmNotes(savedNotes)
            if (savedTasks) setTasks(JSON.parse(savedTasks))

            const storedId = localStorage.getItem('rnr_temp_id') || `User-${Math.floor(Math.random() * 1000)}`
            if (!localStorage.getItem('rnr_temp_id')) localStorage.setItem('rnr_temp_id', storedId)
            setMyIdentity(storedId)
        }
    }, [joinCode])

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`gm_notes_${joinCode}`, gmNotes)
            localStorage.setItem(`gm_tasks_${joinCode}`, JSON.stringify(tasks))
        }
    }, [gmNotes, tasks, joinCode])

    // RESIZE LOGIC
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !boardRef.current) return
            const boardRect = boardRef.current.getBoundingClientRect()
            const relativeY = e.clientY - boardRect.top
            const newPercent = (relativeY / boardRect.height) * 100
            setSceneHeightPercent(Math.min(80, Math.max(20, newPercent)))
        }
        const handleMouseUp = () => {
            setIsResizing(false)
            document.body.style.cursor = 'default'
        }
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = 'row-resize'
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = 'default'
        }
    }, [isResizing])

    // --- SOCKET HOOK ---
    const {
        onGameStateUpdate, onChatMessage, onPlayerAction, onDiceResult,
        requestRoll, sendPlayerAction,
        setPrivateScene, sendWhisper, onWhisperReceived, giveItem
    } = useGameSocket(joinCode, {
        sessionToken: 'DEMO_GM_TOKEN',
        autoConnect: true
    })

    const handleAnnounce = (log: any) => {
        sendPlayerAction({
            actionType: 'ANNOUNCE',
            actorId: 'GM',
            actorName: 'Game Master',
            message: log.content,
            payload: { message: log.content }
        } as any)
    }

    // --- 🔊 AUDIO FUNCTIONS ---
    const playAudio = (track: any, loop: boolean = false) => {
        if (loop) setCurrentTrack(track.name)
        sendPlayerAction({
            actionType: 'PLAY_AUDIO',
            payload: { url: track.url, type: track.type, loop, name: track.name }, // Send name too
            actorName: 'GM'
        } as any)
    }

    const stopBgm = () => {
        setCurrentTrack(null)
        sendPlayerAction({ actionType: 'STOP_BGM', actorName: 'GM' } as any)
    }

    // --- FETCH DATA ---
    const fetchCampaignData = async () => {
        try {
            // 1. ดึงข้อมูลพื้นฐาน
            const data = await getLobbyInfo(joinCode)
            if (data) {
                setSession(data)

                if (data.customScenes) {
                    try { setCustomScenes(JSON.parse(data.customScenes)) } catch (e) { console.error("Parse Error customScenes", e) }
                }
                if (data.customNpcs) {
                    try { setCustomNpcs(JSON.parse(data.customNpcs)) } catch (e) { console.error("Parse Error customNpcs", e) }
                }

                if (data.players) {
                    const loadedInventories: Record<string, any[]> = {}
                    const formattedPlayers = data.players.map((p: any) => {
                        let charData: any = {}
                        try { charData = p.characterData ? JSON.parse(p.characterData) : {} } catch (e) { console.error(e) }
                        if (charData.inventory) loadedInventories[p.id] = charData.inventory
                        return {
                            ...p,
                            character: charData,
                            stats: charData.stats || charData || {},
                            inventory: charData.inventory || []
                        }
                    })
                    setDbPlayers(formattedPlayers)
                    setPlayerInventories(prev => ({ ...prev, ...loadedInventories }))
                }

                const savedActiveNpcs = data.activeNpcs ? JSON.parse(data.activeNpcs) : []
                setGameState((prev: any) => ({
                    ...prev,
                    currentScene: data.currentSceneId,
                    activeNpcs: savedActiveNpcs
                }))

                setIsLoadingData(false)

                // 2. ดึง Assets (Scenes, NPCs, Audio)
                getLobbyAssets(joinCode).then((assets) => {
                    const loadedScenes = assets.scenes || []
                    setCampaignScenes(loadedScenes)
                    setCampaignNpcs(assets.npcs || [])
                    // ✅ Load Audio Tracks
                    setAudioTracks(assets.audioTracks || [])

                    if (data.currentSceneId) {
                        const allScenes = [...loadedScenes, ...(data.customScenes ? JSON.parse(data.customScenes) : [])]
                        const foundScene = allScenes.find((s: any) => s.id === data.currentSceneId)
                        if (foundScene) {
                            setGameState((prev: any) => ({ ...prev, sceneImageUrl: foundScene.imageUrl }))
                        }
                    } else if (loadedScenes.length > 0) {
                        setGameState((prev: any) => ({ ...prev, sceneImageUrl: loadedScenes[0].imageUrl }))
                    }
                    setIsLoadingAssets(false)
                }).catch(err => {
                    console.error("Failed to load assets", err)
                    setIsLoadingAssets(false)
                })
            }
        } catch (err) {
            console.error(err)
            setIsLoadingData(false)
        }
    }

    useEffect(() => {
        fetchCampaignData()
    }, [joinCode])

    // --- SOCKET LISTENERS ---
    useEffect(() => {
        onGameStateUpdate((newState: any) => setGameState((prev: any) => ({ ...prev, ...newState })))
        onChatMessage((message: any) => setLogs((prev) => prev.some(log => log.id === message.id) ? prev : [...prev, message]))

        onWhisperReceived((data: any) => {
            setLogs((prev) => [...prev, {
                id: Date.now().toString(), content: `(Whisper ${data.sender}): ${data.message}`,
                type: 'NARRATION', senderName: 'System', timestamp: new Date()
            }])
        })

        onPlayerAction((action: any) => {
            if (action.actionType === 'PLAYER_KICKED') {
                setDbPlayers(prev => prev.filter(p => p.id !== action.targetPlayerId))
                return
            }

            if (action.actionType === 'RNR_LIVE_UPDATE') {
                setShowingDiceResult(action)
            }

            // ✅ Listen for Audio Events to update UI
            if (action.actionType === 'PLAY_AUDIO') {
                if (action.payload?.loop) setCurrentTrack(action.payload.name)
            }
            if (action.actionType === 'STOP_BGM') {
                setCurrentTrack(null)
            }

            if (action.actionType === 'rnr_roll' || action.actionType === 'dice_roll') {
                if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
                setShowingDiceResult(action)
                overlayTimeoutRef.current = setTimeout(() => {
                    setShowingDiceResult(null)
                    overlayTimeoutRef.current = null
                }, 5000)

                const boostAmount = Number(action.willBoost) || 0
                if (boostAmount > 0) {
                    setDbPlayers(prev => prev.map(p => {
                        const clean = (s: string) => s ? s.toString().toLowerCase().trim() : ''
                        const isMatch = (action.actorId && p.id === action.actorId) ||
                            (clean(p.character?.name) === clean(action.actorName)) ||
                            (clean(p.name) === clean(action.actorName))

                        if (isMatch) {
                            const currentStats = p.stats || {}
                            const currentVitals = currentStats.vitals || {}
                            const isRnR = p.character?.sheetType === 'ROLE_AND_ROLL' || !!currentVitals.willPower
                            const oldWill = isRnR
                                ? (currentVitals.willPower ?? currentStats.willPower ?? 0)
                                : (currentStats.willPower ?? 0)
                            const newWill = Math.max(0, oldWill - boostAmount)
                            const newStats = { ...currentStats, willPower: newWill }
                            if (isRnR) {
                                newStats.vitals = { ...currentVitals, willPower: newWill }
                            }
                            return { ...p, stats: newStats }
                        }
                        return p
                    }))
                }
            }

            if (action.actionType === 'STATS_UPDATE') {
                try {
                    const statsUpdate = JSON.parse(action.description)
                    const changes: string[] = []

                    setDbPlayers(prev => prev.map(p => {
                        if (p.id !== action.targetPlayerId) return p
                        const currentStats = p.stats || (p.characterData ? JSON.parse(p.characterData).stats : {}) || {}
                        const newStats = { ...currentStats, ...statsUpdate }
                        if (statsUpdate.vitals && currentStats.vitals) {
                            newStats.vitals = { ...currentStats.vitals, ...statsUpdate.vitals }
                        } else if (statsUpdate.vitals) {
                            newStats.vitals = statsUpdate.vitals
                        }
                        return { ...p, stats: newStats }
                    }))

                    const targetPlayer = dbPlayers.find(p => p.id === action.targetPlayerId)
                    if (targetPlayer) {
                        const oldStats = targetPlayer.stats || {}
                        const oldVitals = oldStats.vitals || {}
                        const pushLog = (key: string, oldVal: any, newVal: any, label: string) => {
                            if (newVal !== undefined && oldVal !== newVal) {
                                changes.push(`${label} ${newVal > 0 ? '+' : ''}${newVal}`)
                            }
                        }
                        pushLog('hp', oldStats.hp, statsUpdate.hp, 'HP')
                        pushLog('mp', oldStats.mp, statsUpdate.mp, 'MP')
                        pushLog('willPower', oldStats.willPower, statsUpdate.willPower, 'WILL')
                        if (statsUpdate.vitals) {
                            pushLog('hp', oldVitals.hp, statsUpdate.vitals.hp, 'HP')
                            pushLog('mental', oldVitals.mental, statsUpdate.vitals.mental, 'MEN')
                            pushLog('willPower', oldVitals.willPower, statsUpdate.vitals.willPower, 'WILL')
                        }
                        if (changes.length > 0) {
                            setLogs((prev) => [...prev, {
                                id: Date.now().toString(),
                                content: `📊 GM updated ${targetPlayer.name}: ${changes.join(', ')}`,
                                type: 'SYSTEM',
                                senderName: 'GM',
                                timestamp: new Date()
                            }])
                        }
                    }
                } catch (e) { }
                return
            }

            if (action.actionType !== 'GM_UPDATE_SCENE') {
                let content = ''
                if (action.actorName === 'Game Master' && action.actionType === 'custom') {
                    content = action.description
                } else if (action.actorName === 'Game Master') {
                    content = `Game Master : ${action.description || action.actionType}`
                } else {
                    const player = dbPlayers.find(p => p.id === action.actorId)
                    if (player) {
                        const charName = player.character?.name || action.actorName
                        const isPrivate = action.isPrivate || action.payload?.isPrivate
                        const prefix = isPrivate ? '🔒 (Private) ' : ''
                        if (action.actionType === 'use_item') {
                            content = `${prefix}${player.name} (${charName}) : ${action.description || ''}`
                        } else {
                            content = `${prefix}${player.name} (${charName}) ${action.actionType} : ${action.description || ''}`
                        }
                    } else {
                        const isPrivate = action.isPrivate || action.payload?.isPrivate
                        const prefix = isPrivate ? '🔒 (Private) ' : ''
                        content = `${prefix}${action.actorName} ${action.actionType} : ${action.description || ''}`
                    }
                }

                if (!['RNR_LIVE_UPDATE', 'rnr_roll', 'dice_roll', 'WHISPER', 'PLAY_AUDIO', 'STOP_BGM'].includes(action.actionType)) {
                    setLogs((prev) => [...prev, {
                        id: Date.now().toString(), content,
                        type: action.actionType === 'custom' ? 'NARRATION' : 'ACTION',
                        senderName: action.actorName, timestamp: new Date()
                    }])
                }
            }

            if (action.actorName === 'Game Master' && action.actionType === 'custom') setGmNarration(action.description)

            if (action.actionType === 'PLAYER_INVENTORY_UPDATE') {
                const items = action.payload?.inventory || []
                if (Array.isArray(items)) {
                    setPlayerInventories(prev => ({ ...prev, [action.targetPlayerId || '']: items }))
                }
            }
        })

    }, [onGameStateUpdate, onChatMessage, onPlayerAction, onWhisperReceived, dbPlayers, joinCode])

    useEffect(() => {
        onDiceResult(async (result: any) => {
            const playerName = result.playerName || result.actorName || 'Unknown'
            if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
            setShowingDiceResult(result)
            overlayTimeoutRef.current = setTimeout(() => {
                setShowingDiceResult(null)
                overlayTimeoutRef.current = null
            }, 3000)

            let logMessage = ''
            if (result.details && Array.isArray(result.details)) {
                logMessage = `🎲 ${playerName} rolled Role & Roll: ${result.total}`
            } else {
                const successText = result.total >= (result.dc || 0) ? '✅ Success' : '❌ Failed'
                logMessage = `🎲 ${playerName} rolled ${result.checkType}: ${result.total} (DC ${result.dc}) ${successText}`
            }

            setLogs((prev) => [...prev, {
                id: `${Date.now()}-dice`,
                content: logMessage,
                type: 'DICE',
                senderName: playerName,
                timestamp: new Date()
            }])
        })
    }, [joinCode])

    // --- GM Actions ---
    const handleGmNarrate = () => {
        if (!gmInput.trim()) return
        sendPlayerAction({ actionType: 'custom', description: gmInput, actorName: 'Game Master' } as any)
        setGmInput('')
    }

    const handleAskAI = async () => {
        if (isAiLoading) return
        setIsAiLoading(true)
        try {
            const chatHistory = logs.slice(-10).map(log => ({
                role: log.senderName === 'Game Master' || log.senderName === 'GM' ? 'assistant' : 'user',
                content: `${log.senderName}: ${log.content}`
            }))
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId: session?.campaign?.id,
                    history: chatHistory,
                    gameState: {
                        currentScene: campaignScenes.find(s => s.id === gameState.currentScene)?.name || 'Unknown',
                        activeNpcs: gameState.activeNpcs.map((n: any) => n.name)
                    }
                })
            })
            const data = await response.json()
            if (data.result) {
                setGmInput(data.result)
            } else {
                alert("AI didn't respond. Check console.")
            }
        } catch (error) {
            console.error("AI Error:", error)
            alert("Failed to connect to AI.")
        } finally {
            setIsAiLoading(false)
        }
    }

    const handleGmRoll = () => {
        const system = session?.campaign?.system || 'STANDARD'
        if (system === 'ROLE_AND_ROLL') {
            const rows: any[][] = []
            let currentWaveCount = 5
            let totalScore = 0
            while (currentWaveCount > 0) {
                const waveResults = []
                let nextWaveCount = 0
                for (let i = 0; i < currentWaveCount; i++) {
                    const res = rollD4RnR()
                    waveResults.push(res)
                    totalScore += res.score
                    if (res.triggersReroll) nextWaveCount++
                }
                rows.push(waveResults)
                currentWaveCount = nextWaveCount
                if (rows.length > 10) break
            }
            const actionData = {
                actionType: 'rnr_roll',
                actorName: 'Game Master',
                total: totalScore,
                details: rows,
                checkType: 'GM Roll'
            }
            setDiceResult({ roll: totalScore, total: totalScore, checkType: 'GM Roll (RnR)', actorName: 'GM' })
            sendPlayerAction(actionData as any)
        } else {
            const roll = Math.floor(Math.random() * 20) + 1
            setDiceResult({ roll, total: roll, checkType: 'GM Roll', actorName: 'GM' })
            sendPlayerAction({ actionType: 'dice_roll', actorName: 'Game Master', checkType: 'D20 Check', roll, mod: 0, total: roll, dc: 0 } as any)
        }
        setTimeout(() => setDiceResult(null), 3000)
    }

    const changeScene = async (sceneId: string, imageUrl: string) => {
        const newState = { ...gameState, currentScene: sceneId, sceneImageUrl: imageUrl, activeNpcs: gameState.activeNpcs }
        setGameState(newState)
        await sendPlayerAction({
            actionType: 'GM_UPDATE_SCENE',
            payload: newState,
            actorName: 'Game Master',
            description: 'GM changed the scene.'
        } as any)
        updateGameSessionState(joinCode, { currentScene: sceneId, activeNpcs: gameState.activeNpcs }).catch(console.error)
    }

    const toggleNpc = async (npc: any) => {
        const currentNpcs = gameState?.activeNpcs || []
        const isActive = currentNpcs.some((n: any) => n.id === npc.id)
        const npcImage = npc.avatarUrl || npc.imageUrl

        let newNpcs = isActive ? currentNpcs.filter((n: any) => n.id !== npc.id) : [...currentNpcs, { ...npc, imageUrl: npcImage }]
        const newState = { ...gameState, activeNpcs: newNpcs }
        setGameState(newState)
        await sendPlayerAction({
            actionType: 'GM_UPDATE_SCENE',
            payload: { activeNpcs: newNpcs, currentScene: gameState.currentScene, sceneImageUrl: gameState.sceneImageUrl },
            actorName: 'Game Master',
            description: isActive ? `GM removed ${npc.name}` : `GM spawned ${npc.name}`
        } as any)
        updateGameSessionState(joinCode, { currentScene: gameState.currentScene, activeNpcs: newNpcs }).catch(console.error)
    }

    const handleKickPlayer = async (playerId: string, playerName: string) => {
        if (!confirm(`Kick ${playerName}?`)) return
        await kickPlayer(playerId)
        await sendPlayerAction({ actionType: 'PLAYER_KICKED', targetPlayerId: playerId } as any)
        setDbPlayers(prev => prev.filter(p => p.id !== playerId))
    }

    const handlePauseGame = async () => {
        if (!confirm("Pause Session?")) return
        await updateGameSessionState(joinCode, { currentScene: gameState.currentScene, activeNpcs: gameState.activeNpcs })
        await pauseGameSession(joinCode)
        router.push('/')
    }

    const handleEndSession = async () => {
        if (!confirm("⚠️ END SESSION PERMANENTLY?")) return
        await sendPlayerAction({ actionType: 'SESSION_ENDED', description: 'Session Ended.', actorName: 'System' } as any)
        await endGameSession(joinCode)
        router.push('/')
    }

    const handleGiveItem = async (targetPlayerId: string, itemData: any, action: string) => {
        giveItem(targetPlayerId, itemData, action as 'GIVE_CUSTOM' | 'REMOVE')
        setPlayerInventories(prev => {
            const currentItems = prev[targetPlayerId] || []
            let newItems = []
            if (action === 'REMOVE') {
                newItems = currentItems.filter((i: any) => i.id !== itemData.id)
            } else {
                newItems = [...currentItems, itemData]
            }
            updatePlayerInventory(targetPlayerId, newItems).then(res => {
                if (!res.success) console.error("Failed to save inventory for", targetPlayerId)
            })
            return { ...prev, [targetPlayerId]: newItems }
        })
    }

    const handleUpdateVitals = async (playerId: string, type: 'hp' | 'mp', delta: number) => {
        const player = dbPlayers.find(p => p.id === playerId)
        if (!player || !player.stats) return

        const isRnR = player.character?.sheetType === 'ROLE_AND_ROLL'
        let statsUpdate: any = {}

        if (isRnR) {
            const current = player.stats.vitals || {}
            const key = type === 'hp' ? 'hp' : 'mental'
            const maxKey = type === 'hp' ? 'maxHp' : 'maxMental'
            const oldValue = current[key] ?? (type === 'hp' ? current.health : 0) ?? 0
            const maxValue = current[maxKey] ?? (type === 'hp' ? current.maxHealth : 0) ?? 0
            const newValue = Math.max(0, Math.min(maxValue, oldValue + delta))
            statsUpdate = { vitals: { ...current, [key]: newValue } }
        } else {
            const key = type
            const maxKey = type === 'hp' ? 'maxHp' : 'maxMp'
            const oldValue = player.stats[key] || 0
            const maxValue = player.stats[maxKey] || 0
            const newValue = Math.max(0, Math.min(maxValue, oldValue + delta))
            statsUpdate = { [key]: newValue }
        }

        setDbPlayers(prev => prev.map(p => {
            if (p.id === playerId) return { ...p, stats: { ...p.stats, ...statsUpdate } }
            return p
        }))

        const changeText = type.toUpperCase() + ' ' + (delta > 0 ? '+' : '') + delta
        setLogs(prev => [...prev, {
            id: Date.now().toString(),
            content: `📊 GM updated ${player.name}: ${changeText}`,
            type: 'SYSTEM',
            senderName: 'GM',
            timestamp: new Date()
        }])

        try {
            await updateCharacterStats(playerId, statsUpdate)
            await sendPlayerAction({
                actionType: 'STATS_UPDATE',
                targetPlayerId: playerId,
                actorName: 'GM',
                description: JSON.stringify(statsUpdate)
            } as any)
        } catch (error) {
            console.error('❌ Failed to update vitals:', error)
        }
    }

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newItemName || !newItemUrl) return
        setIsAddingItem(true)
        try {
            const tempItem = {
                id: `temp_${Date.now()}`,
                name: newItemName,
                imageUrl: newItemUrl,
                avatarUrl: newItemUrl,
                isCustom: true
            }
            if (addModalType === 'SCENE') setCustomScenes(prev => [...prev, tempItem])
            else setCustomNpcs(prev => [...prev, tempItem])
            await addCustomAsset(session.id, addModalType, newItemName, newItemUrl)
            setIsAddModalOpen(false)
            setNewItemName('')
            setNewItemUrl('')
        } catch (error) {
            console.error("Quick Add Failed:", error)
            alert("Failed to add asset.")
        } finally {
            setIsAddingItem(false)
        }
    }

    const partyPlayers = dbPlayers.filter(p => p.role !== 'GM')
    const campaignSystem = session?.campaign?.system || 'STANDARD'
    const SHORTCUT_STATS = campaignSystem === 'ROLE_AND_ROLL'
        ? ['Strength', 'Dexterity', 'Intellect', 'Charm']
        : ['STR', 'DEX', 'INT', 'WIS', 'CHA']

    const allScenes = [...campaignScenes, ...customScenes]
    const allNpcs = [...campaignNpcs, ...customNpcs]

    if (isLoadingData) {
        return (
            <div className="h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-amber-500 font-bold animate-pulse">Entering Session...</div>
            </div>
        )
    }

    const currentSceneUrl = gameState?.sceneImageUrl || '/placeholder.jpg'
    // ✅ ดึงชื่อของเรา (ถ้าเป็น GM หรือ Player)
    const myName = dbPlayers.find(p => p.id === myIdentity)?.name || 'Game Master'

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans relative">

            {/* ✅ Audio Manager & Modal */}
            <AudioManager roomCode={joinCode} />
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                playerData={{
                    name: myName,
                    role: 'GM', // ในหน้านี้เป็น GM เสมอ
                    image: `https://api.dicebear.com/7.x/adventurer/svg?seed=${myIdentity}`
                }}
            />

            {/* HEADER */}
            <div className="absolute top-0 w-full h-14 bg-slate-900/90 border-b border-slate-700 flex justify-between items-center px-4 z-50 backdrop-blur-md shadow-lg">
                <h1 className="text-amber-500 font-bold tracking-widest text-sm md:text-lg uppercase flex items-center gap-2">
                    <span>GM Dashboard</span>
                    {isLoadingAssets && <span className="text-[10px] text-slate-500 animate-pulse hidden md:inline">(Loading...)</span>}
                </h1>

                <div className="flex items-center gap-3">
                    {/* System Controls (Pause/End) */}
                    <div className="hidden md:flex gap-1 mr-2">
                        <button onClick={handlePauseGame} className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-full transition-colors border border-slate-700" title="Pause Game">⏸</button>
                        <button onClick={handleEndSession} className="w-8 h-8 flex items-center justify-center bg-red-900/20 hover:bg-red-900/50 text-red-500 rounded-full transition-colors border border-red-900/50" title="End Session">🛑</button>
                    </div>

                    {/* ✅ Unified Profile Button */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-3 pl-1 pr-1 py-1 rounded-full hover:bg-slate-800 transition-all group border border-transparent hover:border-slate-700"
                    >
                        {/* ชื่อ (โชว์เฉพาะจอใหญ่) */}
                        <div className="text-right hidden md:block">
                            <div className="text-xs font-bold text-slate-200 group-hover:text-amber-500 transition-colors">{myName}</div>
                            <div className="text-[9px] text-slate-500 font-bold">GAME MASTER</div>
                        </div>

                        {/* รูปโปรไฟล์ */}
                        <div className="w-9 h-9 rounded-full bg-slate-700 border-2 border-slate-600 group-hover:border-amber-500 overflow-hidden shadow-sm transition-all relative">
                            <img
                                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${myIdentity}`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                            {/* จุดเขียวบอกว่า Online */}
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                        </div>
                    </button>

                    {/* Mobile Menu Button */}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-slate-300 border border-slate-700 rounded bg-slate-800 ml-2">{isSidebarOpen ? '✖' : '☰'}</button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex flex-1 pt-14 pb-24 md:pb-32 h-full w-full relative">

                {/* LEFT: Board & Log with Resize */}
                <div className="flex-1 flex flex-col w-full h-full min-w-0 relative" ref={boardRef}>

                    {/* Scene Area (Height controlled by state) */}
                    <div style={{ height: `${sceneHeightPercent}%` }} className="w-full relative bg-black shrink-0">
                        <SceneDisplay sceneDescription={gmNarration} imageUrl={currentSceneUrl} npcs={gameState?.activeNpcs || []} />
                        {showingDiceResult && (
                            <DiceResultOverlay
                                result={showingDiceResult}
                                onClose={() => setShowingDiceResult(null)}
                            />
                        )}
                        {diceResult && !showingDiceResult && (
                            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
                                <div className="bg-slate-900 p-8 rounded-2xl border-2 border-amber-500 text-center animate-in zoom-in">
                                    <div className="text-7xl font-bold text-white">{diceResult.total}</div>
                                    <div className="text-xs text-amber-500 mt-2 uppercase tracking-widest">{diceResult.checkType}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DRAG HANDLE */}
                    <div
                        onMouseDown={() => setIsResizing(true)}
                        className="h-2 w-full bg-slate-800 hover:bg-amber-500 cursor-row-resize flex items-center justify-center shrink-0 transition-colors z-20 group"
                    >
                        <div className="w-12 h-1 bg-slate-600 rounded-full group-hover:bg-white transition-colors" />
                    </div>

                    {/* Log Area */}
                    <div className="flex-1 bg-slate-950 border-t border-slate-800 flex flex-col min-h-0">
                        <div className="bg-slate-900 px-3 py-1 text-xs font-bold text-slate-500 uppercase flex justify-between">
                            <span>Adventure Log</span>
                            <span className="text-[10px] opacity-50">Drag bar above to resize</span>
                        </div>
                        <div className="flex-1 p-2 overflow-y-auto custom-scrollbar"><GameLog logs={logs} onAnnounce={handleAnnounce} /></div>
                    </div>
                </div>

                {/* RIGHT: Sidebar */}
                <div className={`fixed inset-y-0 right-0 z-40 w-96 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 pt-14 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:relative lg:translate-x-0 lg:flex lg:pt-0 lg:w-96 lg:shadow-none flex flex-col h-full overflow-hidden`}>

                    {/* ✅ TAB HEADER DESIGN */}
                    <div className="relative z-10 bg-slate-900 shadow-md">
                        {/* Container หลักที่กำหนด Scroll */}
                        <div className="flex overflow-x-auto no-scrollbar border-b border-slate-800">
                            {/* ใช้ map สร้างปุ่ม */}
                            {['PARTY', 'SCENE', 'NPC', 'AUDIO', 'NOTE', 'STORY'].map(tab => (
                                <TabButton
                                    key={tab}
                                    active={activeTab === tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    label={tab}
                                />
                            ))}
                            {/* ดันพื้นที่ว่างด้านขวานิดนึงเผื่อปุ่มสุดท้ายชิดขอบเกินไป */}
                            <div className="w-4 shrink-0" />
                        </div>

                        {/* ✨ Fade Effect ด้านขวา (ทำให้รู้ว่ามีเมนูต่อ) */}
                        <div className="absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 min-h-0 p-3 overflow-y-auto custom-scrollbar">
                        {activeTab === 'PARTY' && (
                            <EnhancedPartyStatus
                                players={partyPlayers}
                                scenes={allScenes.map(s => ({ id: s.id, name: s.name, url: s.imageUrl }))}
                                system={campaignSystem as any}
                                onSetPrivateScene={(pid, sid) => { setPrivateScene(pid, sid) }}
                                onWhisper={sendWhisper}
                                onGiveItem={handleGiveItem}
                                onRequestRoll={(pid, checkType, dc) => { requestRoll(checkType, dc, pid) }}
                                onKickPlayer={handleKickPlayer}
                                onUpdateVitals={handleUpdateVitals}
                                playerInventories={playerInventories}
                            />
                        )}
                        {activeTab === 'SCENE' && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { setAddModalType('SCENE'); setIsAddModalOpen(true) }}
                                    className="aspect-video bg-slate-800 border-2 border-dashed border-slate-600 rounded flex flex-col items-center justify-center hover:bg-slate-700 hover:border-amber-500 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-700 group-hover:bg-amber-500 flex items-center justify-center text-slate-400 group-hover:text-black transition-colors mb-1">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-white">Add Scene</span>
                                </button>
                                {allScenes.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => changeScene(s.id, s.imageUrl)}
                                        className={`aspect-video bg-black rounded border-2 cursor-pointer relative group ${gameState.sceneImageUrl === s.imageUrl ? 'border-amber-500' : (s.isCustom ? 'border-green-600/50 hover:border-green-400' : 'border-slate-700 hover:border-slate-500')}`}
                                    >
                                        <Image
                                            src={s.imageUrl || '/placeholder.jpg'}
                                            alt={s.name}
                                            fill
                                            className="object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                            sizes="(max-width: 768px) 50vw, 25vw"
                                        />
                                        <div className="absolute bottom-0 w-full bg-black/60 text-white text-[9px] p-1 truncate flex justify-between items-center z-10">
                                            <span>{s.name}</span>
                                            {s.isCustom && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'NPC' && (
                            <div className="space-y-1">
                                <button
                                    onClick={() => { setAddModalType('NPC'); setIsAddModalOpen(true) }}
                                    className="w-full flex items-center justify-center gap-2 p-3 rounded border-2 border-dashed border-slate-700 hover:border-green-500 hover:bg-slate-800 text-slate-500 hover:text-green-400 transition-all mb-3 font-bold text-xs uppercase"
                                >
                                    <span>+ Add Temporary NPC</span>
                                </button>
                                {allNpcs.map(npc => {
                                    const active = gameState.activeNpcs.some((n: any) => n.id === npc.id)
                                    const displayImage = npc.avatarUrl || npc.imageUrl
                                    return (
                                        <div
                                            key={npc.id}
                                            onClick={() => toggleNpc(npc)}
                                            className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${active ? 'bg-amber-900/20 border-amber-500' : (npc.isCustom ? 'border-green-900/30 hover:border-green-500/50' : 'hover:bg-slate-800 border-transparent')}`}
                                        >
                                            <div className="relative w-8 h-8 rounded bg-black overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={displayImage || '/placeholder.jpg'}
                                                    alt={npc.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="32px"
                                                />
                                                {npc.isCustom && <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-black z-10"></div>}
                                            </div>
                                            <span className="text-xs text-white font-bold flex-1">{npc.name}</span>
                                            {active && <span className="text-[9px] text-amber-500">ON BOARD</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* ✅ AUDIO TAB CONTENT (UPDATED & SEPARATED) */}
                        {activeTab === 'AUDIO' && (
                            <div className="space-y-4 p-1">
                                {/* 1. Now Playing Banner (โชว์เมื่อมีเพลงเล่นอยู่) */}
                                {currentTrack && (
                                    <div className="bg-slate-800 p-3 rounded-lg border border-amber-500/50 shadow-lg animate-pulse flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 flex items-center justify-center bg-amber-500 text-black rounded-full animate-spin-slow">🎵</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Now Playing</div>
                                            <div className="text-sm text-white font-medium truncate">{currentTrack}</div>
                                        </div>
                                    </div>
                                )}

                                {/* 2. Background Music (BGM) Section */}
                                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-amber-500 uppercase">🎵 Background Music</h4>
                                        <button
                                            onClick={stopBgm}
                                            className="text-[10px] bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-900/50 hover:bg-red-900/50 transition-colors"
                                        >
                                            ■ STOP
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        {audioTracks.filter(t => t.type === 'BGM').length === 0 && (
                                            <div className="text-xs text-slate-600 italic p-2 text-center">No BGM tracks</div>
                                        )}
                                        {audioTracks.filter(t => t.type === 'BGM').map(track => (
                                            <div key={track.id} className="flex items-center justify-between bg-slate-900 p-2 rounded hover:bg-slate-800 border border-slate-800 hover:border-slate-600 transition-all group">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className="text-xs text-slate-400">🎵</span>
                                                    <span className="text-xs text-slate-300 font-medium truncate">{track.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => playAudio(track, true)}
                                                    className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded shadow-sm transition-all active:scale-95"
                                                >
                                                    Play Loop
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Sound Effects (SFX) Section */}
                                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                    <h4 className="text-xs font-bold text-emerald-500 uppercase mb-2">🔊 Sound Effects</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {audioTracks.filter(t => t.type === 'SFX').length === 0 && (
                                            <div className="col-span-2 text-xs text-slate-600 italic p-2 text-center">No SFX tracks</div>
                                        )}
                                        {audioTracks.filter(t => t.type === 'SFX').map(track => (
                                            <button
                                                key={track.id}
                                                onClick={() => playAudio(track, false)}
                                                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 p-2 rounded text-xs text-slate-300 text-left transition-all active:scale-95 truncate flex items-center gap-2"
                                                title={track.name}
                                            >
                                                <span>🔊</span>
                                                <span className="truncate">{track.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'NOTE' && (
                            <div className="space-y-4">
                                <textarea value={gmNotes} onChange={e => setGmNotes(e.target.value)} className="w-full h-40 bg-slate-950 border-slate-700 rounded p-2 text-xs text-slate-300" placeholder="Notes..." />
                                <div>
                                    <h4 className="text-xs font-bold text-emerald-500 uppercase mb-2">Tasks</h4>
                                    <div className="flex gap-2 mb-2">
                                        <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Task..." />
                                        <button onClick={addTask} className="text-emerald-500 font-bold">+</button>
                                    </div>
                                    <div className="space-y-1">
                                        {tasks.map(t => (
                                            <div key={t.id} className="flex items-center gap-2 text-xs">
                                                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} className="accent-emerald-500" />
                                                <span className={t.done ? 'line-through text-slate-600' : 'text-slate-300'}>{t.text}</span>
                                                <button onClick={() => removeTask(t.id)} className="ml-auto text-slate-600 hover:text-red-500">×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'STORY' && (
                            <div className="space-y-4 text-xs text-slate-300">
                                <div className="bg-slate-950 p-2 rounded border border-slate-800"><h4 className="font-bold text-amber-500 mb-1">Intro</h4><p className="whitespace-pre-wrap">{session?.campaign?.storyIntro || '-'}</p></div>
                                <div className="bg-slate-950 p-2 rounded border border-slate-800"><h4 className="font-bold text-amber-500 mb-1">Mid-Game</h4><p className="whitespace-pre-wrap">{session?.campaign?.storyMid || '-'}</p></div>
                                <div className="bg-slate-950 p-2 rounded border border-slate-800"><h4 className="font-bold text-amber-500 mb-1">Ending</h4><p className="whitespace-pre-wrap">{session?.campaign?.storyEnd || '-'}</p></div>
                            </div>
                        )}
                    </div>

                    {/* Voice Panel */}
                    <div className="shrink-0 z-20 pb-24 lg:pb-0">
                        <VoicePanel
                            room={joinCode}
                            username={myIdentity || 'GM'}
                        />
                    </div>
                </div>
            </div>

            {/* BOTTOM CONTROLS */}
            <div className="absolute bottom-0 w-full h-auto min-h-[80px] md:h-32 bg-slate-900 border-t border-slate-700 flex flex-col md:flex-row items-center px-4 py-2 gap-3 z-50">
                <div className="flex gap-2 shrink-0">
                    <button onClick={handleGmRoll} className="bg-amber-600 hover:bg-amber-500 text-black px-4 py-2 rounded-lg font-black shadow-lg active:scale-95 transition-all flex items-center gap-2"><span className="text-xl">🎲</span><span className="hidden md:inline">GM Roll</span></button>
                </div>

                <div className="w-full md:flex-1 flex gap-2">
                    <button
                        onClick={handleAskAI}
                        disabled={isAiLoading}
                        className={`px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all 
                            ${isAiLoading ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95'}`}
                    >
                        {isAiLoading ? <span className="animate-spin">⏳</span> : <span>✨ AI Assist</span>}
                    </button>
                    <input value={gmInput} onChange={e => setGmInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGmNarrate()} placeholder="Narrate..." className="flex-1 bg-slate-800 border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 h-12" />
                    <button onClick={handleGmNarrate} className="bg-slate-700 text-slate-200 px-3 py-2 rounded text-sm font-bold h-12">Send</button>
                </div>

                <div className="w-full md:w-auto flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <input type="number" value={targetDC} onChange={e => setTargetDC(Number(e.target.value))} className="w-12 bg-slate-800 border-slate-700 rounded text-center text-amber-500 font-bold text-sm h-10" />
                    {SHORTCUT_STATS.map(stat => (
                        <button key={stat} onClick={() => requestRoll(`${stat} Check`, targetDC)} className="w-10 h-10 bg-slate-800 border-slate-600 rounded flex flex-col items-center justify-center active:scale-95 hover:border-slate-400">
                            <span className="text-[8px] text-slate-400">{stat.substring(0, 3)}</span>
                            <span className="text-xs">🎲</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ADD ASSET MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Add Temporary {addModalType === 'SCENE' ? 'Scene' : 'NPC'}</h3>
                        <form onSubmit={handleQuickAdd} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Name</label>
                                <input required value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" placeholder="e.g. Dark Cave" />
                            </div>
                            <ImageUploader
                                value={newItemUrl}
                                onChange={setNewItemUrl}
                                label="Image"
                                aspectRatio={addModalType === 'SCENE' ? 'aspect-video' : 'aspect-square'}
                                required
                            />
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded font-bold">Cancel</button>
                                <button type="submit" disabled={isAddingItem || !newItemUrl} className="flex-1 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isAddingItem ? 'Adding...' : 'Add Asset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function TabButton({ active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`
                shrink-0 /* 👈 สำคัญ: ห้ามหดปุ่มเด็ดขาด */
                relative px-5 py-3 text-xs font-bold uppercase tracking-wider 
                transition-all duration-200 
                whitespace-nowrap /* 👈 สำคัญ: ข้อความห้ามขึ้นบรรทัดใหม่ */
                border-b-2 
                hover:bg-slate-800
                ${active
                    ? 'text-amber-500 border-amber-500 bg-slate-800/50'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }
            `}
        >
            {label}
        </button>
    )
}