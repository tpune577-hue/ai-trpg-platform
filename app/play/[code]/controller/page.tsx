'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import { getLobbyInfo, submitReview, updateCharacterStats } from '@/app/actions/game'
import { SceneDisplay } from '@/components/board/SceneDisplay'
import { GameLog } from '@/components/board/GameLog'
import RnRRoller from '@/components/game/RnRRoller'
import { getRnRModifiersForAction, getRnRModifiersForCheck, getRelevantAbilities } from '@/lib/rnr-character-utils'

// ✅ LiveKit Imports
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react'
import { VoicePTTButton } from '@/components/game/LiveKitWidgets'
import '@livekit/components-styles'

export default function PlayerControllerPage() {
    const params = useParams()
    const router = useRouter()
    const joinCode = params.code as string

    // --- PLAYER STATE ---
    const [playerId] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedSession = localStorage.getItem(`trpg_session_${joinCode}`)
            if (savedSession) {
                try {
                    const data = JSON.parse(savedSession)
                    if (data.playerId) return data.playerId
                } catch (e) { }
            }
            return localStorage.getItem('trpg_player_id') || `player-${Math.floor(Math.random() * 10000)}`
        }
        return `player-${Math.floor(Math.random() * 10000)}`
    })

    const [character, setCharacter] = useState<any>(null)
    const [playerName, setPlayerName] = useState<string>('')
    const hasJoined = useRef(false)

    // ✅ VOICE CHAT STATE
    const [voiceToken, setVoiceToken] = useState('')

    // --- GAME STATE ---
    const [gameState, setGameState] = useState<any>({
        currentScene: null,
        sceneImageUrl: '',
        activeNpcs: []
    })
    const [campaignScenes, setCampaignScenes] = useState<any[]>([])
    const [campaignSystem, setCampaignSystem] = useState<'STANDARD' | 'ROLE_AND_ROLL'>('STANDARD')

    // --- UI STATE ---
    const [logs, setLogs] = useState<any[]>([])
    const [customAction, setCustomAction] = useState('')
    const [activeTab, setActiveTab] = useState<'ACTIONS' | 'INVENTORY' | 'CHARACTER'>('ACTIONS')
    const [gmNarration, setGmNarration] = useState<string>('')
    const [sceneNotification, setSceneNotification] = useState<string>('')
    const [announcement, setAnnouncement] = useState<string>('')
    const [inventory, setInventory] = useState<any[]>([])

    // --- OVERLAYS ---
    const [selectedItemDetail, setSelectedItemDetail] = useState<any>(null)
    const [isPrivateAction, setIsPrivateAction] = useState(false)

    // Roll State
    const [rollRequest, setRollRequest] = useState<any>(null)
    const [isRnRRolling, setIsRnRRolling] = useState(false)
    const [isRequestedRoll, setIsRequestedRoll] = useState(false)
    const [currentRnRAction, setCurrentRnRAction] = useState<string>('')
    const [willBoost, setWillBoost] = useState(0)
    const [lastWhisper, setLastWhisper] = useState<{ sender: string, message: string } | null>(null)
    const [privateSceneId, setPrivateSceneId] = useState<string | null>(null)

    // Review Modal
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [rating, setRating] = useState(5)
    const [reviewComment, setReviewComment] = useState('')
    const [isSubmittingReview, setIsSubmittingReview] = useState(false)

    // Debug State
    const [debugLogs, setDebugLogs] = useState<string[]>([])
    const [showDebug, setShowDebug] = useState(false)
    const addDebugLog = (msg: string) => setDebugLogs(prev => [msg, ...prev].slice(0, 20))

    // Refs
    const logContainerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // --- SOCKET CONNECTION ---
    const {
        sendPlayerAction, onGameStateUpdate, onRollRequested, onChatMessage,
        onPlayerAction, onDiceResult, onPrivateSceneUpdate, onWhisperReceived, onAnnounce
    } = useGameSocket(joinCode, { sessionToken: 'DEMO_PLAYER_TOKEN', userId: playerId, autoConnect: true })

    // Load player name
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedSession = localStorage.getItem(`trpg_session_${joinCode}`)
            if (savedSession) {
                try {
                    const data = JSON.parse(savedSession)
                    if (data.name) setPlayerName(data.name)
                } catch (e) { }
            }
        }
    }, [joinCode])

    // ✅ FETCH VOICE TOKEN (เมื่อได้ชื่อผู้เล่นแล้ว)
    useEffect(() => {
        if (!joinCode || !playerName) return;
        (async () => {
            try {
                const resp = await fetch(`/api/livekit/token?room=${joinCode}&username=${playerName}`);
                if (resp.ok) {
                    const data = await resp.json();
                    setVoiceToken(data.token);
                }
            } catch (e) {
                console.error("Voice Token Error:", e);
            }
        })();
    }, [joinCode, playerName]);

    // --- INITIAL SYNC & JOIN ---
    useEffect(() => {
        const initGame = async () => {
            try {
                const session = await getLobbyInfo(joinCode)
                if (!session) return
                if (session.status === 'ENDED') { setShowReviewModal(true); return }
                if (session.campaign?.system) setCampaignSystem(session.campaign.system as any)

                let targetSceneId = session.currentSceneId
                let targetSceneUrl = ''
                let targetNpcs = []
                try {
                    if (typeof session.activeNpcs === 'string') targetNpcs = JSON.parse(session.activeNpcs)
                    else if (Array.isArray(session.activeNpcs)) targetNpcs = session.activeNpcs
                } catch (e) { console.error("NPC Parse Error", e) }

                if (targetSceneId) {
                    const s = session.campaign?.scenes?.find((s: any) => s.id === targetSceneId)
                    targetSceneUrl = s?.imageUrl || ''
                } else if (session.campaign?.scenes && session.campaign.scenes.length > 0) {
                    targetSceneId = session.campaign.scenes[0].id
                    targetSceneUrl = session.campaign.scenes[0].imageUrl
                }

                setGameState({ currentScene: targetSceneId, sceneImageUrl: targetSceneUrl, activeNpcs: targetNpcs })
                setCampaignScenes(session.campaign?.scenes || [])

                const myPlayer = session.players?.find((p: any) => p.id === playerId)
                if (myPlayer) {
                    let charData: any = {}
                    try { charData = myPlayer.characterData ? JSON.parse(myPlayer.characterData) : {} } catch (e) { console.error(e) }

                    // ✅ Load Persistent Inventory
                    setInventory(charData.inventory || [])

                    setCharacter({
                        name: charData.name || myPlayer.name || 'Adventurer',
                        hp: charData.hp || 20, maxHp: charData.maxHp || 20,
                        mp: charData.mp || 10, maxMp: charData.maxMp || 10,
                        avatarUrl: charData.avatarUrl || charData.imageUrl || 'https://placehold.co/100x100/333/FFF?text=Hero',
                        stats: charData.stats || charData, // Prioritize loaded stats
                        sheetType: charData.sheetType || 'STANDARD'
                    })
                }
            } catch (error) { console.error("Sync Error:", error) }

            if (!hasJoined.current && character) {
                hasJoined.current = true
                setTimeout(() => {
                    sendPlayerAction({
                        actionType: 'JOIN_GAME', actorId: playerId, actorName: character.name,
                        characterData: { ...character, id: playerId }, description: 'has joined the party.'
                    } as any)
                }, 1000)
            }
        }
        initGame()
    }, [joinCode, playerId, sendPlayerAction])

    // --- SOCKET HANDLERS ---
    useEffect(() => {
        if (onRollRequested) {
            onRollRequested((req: any) => {
                const isRnRCampaign = campaignSystem === 'ROLE_AND_ROLL'
                const isRnRCharacter = character?.sheetType === 'ROLE_AND_ROLL'
                if (isRnRCampaign && isRnRCharacter) {
                    setCurrentRnRAction(req.checkType)
                    setIsRequestedRoll(true)
                    setIsRnRRolling(true)
                } else {
                    setRollRequest(req)
                }
            })
        }

        if (onGameStateUpdate) {
            onGameStateUpdate((newState: any) => {
                setGameState((prev: any) => {
                    let updatedNpcs = newState.activeNpcs
                    if (typeof updatedNpcs === 'string') { try { updatedNpcs = JSON.parse(updatedNpcs) } catch (e) { } }
                    return {
                        ...prev, ...newState,
                        currentScene: newState.currentScene || prev.currentScene,
                        sceneImageUrl: newState.sceneImageUrl || prev.sceneImageUrl,
                        activeNpcs: updatedNpcs !== undefined ? updatedNpcs : (prev.activeNpcs || [])
                    }
                })
            })
        }

        if (onPrivateSceneUpdate) onPrivateSceneUpdate((data: any) => setPrivateSceneId(data.sceneId))

        const handleLog = (msg: any) => {
            setLogs((prev) => {
                if (prev.some(l => l.id === msg.id)) return prev
                return [...prev, msg]
            })
            setTimeout(() => scrollToBottom(), 100)
        }

        if (onChatMessage) onChatMessage(handleLog)
        if (onWhisperReceived) onWhisperReceived((data: any) => {
            setLastWhisper(data)
            setTimeout(() => setLastWhisper(null), 8000)
            handleLog({ id: Date.now().toString(), content: `🤫 Whisper from ${data.sender}: "${data.message}"`, type: 'WHISPER', senderName: data.sender, timestamp: new Date() })
        })
        if (onAnnounce) onAnnounce((data: any) => { setAnnouncement(data.message); setTimeout(() => setAnnouncement(''), 15000) })

        if (onPlayerAction) {
            onPlayerAction((action: any) => {
                if (action.actionType === 'GM_UPDATE_SCENE') {
                    const payload = action.payload || {}
                    let newNpcs = payload.activeNpcs || []
                    if (typeof newNpcs === 'string') { try { newNpcs = JSON.parse(newNpcs) } catch (e) { newNpcs = [] } }
                    setGameState((prev: any) => ({ ...prev, currentScene: payload.currentScene || prev.currentScene, sceneImageUrl: payload.sceneImageUrl || prev.sceneImageUrl, activeNpcs: Array.isArray(newNpcs) ? newNpcs : [] }))
                }
                if (action.actionType === 'SESSION_ENDED') { setShowReviewModal(true); return }
                if (action.actionType === 'PLAYER_KICKED' && action.targetPlayerId === playerId) { alert("You have been kicked by the GM."); router.push('/'); return }

                // Stats Update
                if (action.actionType === 'STATS_UPDATE' && action.targetPlayerId === playerId) {
                    try {
                        const statsUpdate = JSON.parse(action.description)
                        const oldStats = character?.stats || {}
                        const changes: string[] = []
                        if (statsUpdate.hp !== undefined && oldStats.hp !== statsUpdate.hp) changes.push(`HP ${statsUpdate.hp - (oldStats.hp || 0)}`)
                        if (statsUpdate.mp !== undefined && oldStats.mp !== statsUpdate.mp) changes.push(`MP ${statsUpdate.mp - (oldStats.mp || 0)}`)
                        if (changes.length > 0) handleLog({ id: `stats-${Date.now()}`, content: `📊 GM updated: ${changes.join(', ')}`, type: 'SYSTEM', senderName: 'GM', timestamp: new Date() })
                        setCharacter((prev: any) => ({ ...prev, stats: { ...prev.stats, ...statsUpdate } }))
                    } catch (error) { console.error('Stats update error:', error) }
                    return
                }

                // Inventory Update
                if (action.actionType === 'GM_MANAGE_INVENTORY' && action.targetPlayerId === playerId) {
                    const { itemData, action: mode } = action.payload || {};
                    if (mode === 'GIVE_CUSTOM' || mode === 'ADD') {
                        setInventory(prev => { if (prev.some(i => i.id === itemData.id)) return prev; return [...prev, itemData] })
                        handleLog({ id: `item-${Date.now()}`, content: `🎁 Received: ${itemData.name}`, type: 'NARRATION', senderName: 'System', timestamp: new Date() })
                    } else if (mode === 'REMOVE') {
                        setInventory(prev => prev.filter(i => i.id !== itemData.id))
                        handleLog({ id: `rm-${Date.now()}`, content: `❌ Removed: ${itemData.name}`, type: 'SYSTEM', senderName: 'System', timestamp: new Date() })
                    }
                    return
                }

                // General Logs
                if (!['GM_MANAGE_INVENTORY', 'GM_UPDATE_SCENE', 'RNR_LIVE_UPDATE', 'rnr_roll', 'dice_roll', 'WHISPER', 'STATS_UPDATE'].includes(action.actionType)) {
                    const isPrivate = action.isPrivate || action.payload?.isPrivate
                    if (isPrivate && action.actorId !== playerId) return
                    handleLog({ id: `${Date.now()}-${action.actionType}`, content: isPrivate ? `🔒 (Private) ${action.description}` : (action.description || `${action.actorName} used ${action.actionType}`), type: 'ACTION', senderName: action.actorName, timestamp: new Date() })
                }
                if (action.actorName === 'Game Master' && action.actionType === 'custom') {
                    setGmNarration(action.description); setTimeout(() => setGmNarration(''), 15000)
                }
            })
        }

        if (onDiceResult) onDiceResult((result: any) => {
            let logMessage = result.details && Array.isArray(result.details) ? `🎲 ${result.actorName} rolled Role & Roll: ${result.total}` : `🎲 ${result.actorName} rolled ${result.total} (${result.roll}+${result.mod})`
            handleLog({ id: Date.now().toString(), content: logMessage, type: 'DICE', senderName: 'System', timestamp: new Date() })
        })

    }, [onRollRequested, onGameStateUpdate, onChatMessage, onPrivateSceneUpdate, onWhisperReceived, onPlayerAction, onDiceResult, playerId, router, campaignSystem])

    useEffect(() => {
        if (gameState?.currentScene) {
            const sceneName = campaignScenes.find(s => s.id === gameState.currentScene)?.name
            if (sceneName) { setSceneNotification(sceneName); setTimeout(() => setSceneNotification(''), 10000) }
        }
    }, [gameState?.currentScene, campaignScenes])

    const scrollToBottom = (smooth = true) => { if (logContainerRef.current) logContainerRef.current.scrollTo({ top: logContainerRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }) }
    const getStatModifier = (checkType: string): number => {
        if (!character?.stats) return 0
        const statName = checkType.split(' ')[0].toUpperCase()
        return Number(character.stats[statName] || character.stats[statName.toLowerCase()] || character.stats[checkType] || 0) || 0
    }

    // Roll Handlers
    const handleRollResponse = async () => {
        if (!rollRequest) return
        const roll = Math.floor(Math.random() * 20) + 1
        const mod = getStatModifier(rollRequest.checkType)
        const total = roll + mod + willBoost
        await sendPlayerAction({ actionType: 'dice_roll', checkType: rollRequest.checkType, dc: rollRequest.dc, roll, mod, willBoost, total, actorName: character?.name } as any)
        if (willBoost > 0 && character?.stats) {
            const newWill = (character.stats.willPower || 0) - willBoost
            setCharacter((prev: any) => ({ ...prev, stats: { ...prev.stats, willPower: newWill } }))
            await updateCharacterStats(playerId, { willPower: newWill })
        }
        setRollRequest(null); setWillBoost(0)
    }

    const handleRnRStepUpdate = async (total: number, steps: any[]) => { await sendPlayerAction({ actionType: 'RNR_LIVE_UPDATE', actorName: character.name, total, details: steps, isRequested: isRequestedRoll } as any) }

    const handleRnRComplete = async (totalScore: number, steps: any[], willUsed: number) => {
        setIsRnRRolling(false)
        if (willUsed > 0 && character?.stats) {
            const newWill = (character.stats.willPower || 0) - willUsed
            setCharacter((prev: any) => ({ ...prev, stats: { ...prev.stats, willPower: newWill } }))
            await updateCharacterStats(playerId, { willPower: newWill })
        }
        await sendPlayerAction({ actionType: 'rnr_roll', actorName: character.name, total: totalScore, details: steps, willBoost: willUsed, description: `rolled Role & Roll check: ${totalScore} `, isRequested: isRequestedRoll } as any)
        setIsRequestedRoll(false)
    }

    const sendCustomAction = async () => {
        if (!customAction.trim()) return
        await sendPlayerAction({ actionType: 'custom', actorId: playerId, actorName: character?.name, description: customAction } as any)
        setCustomAction(''); setTimeout(() => { scrollToBottom(); inputRef.current?.focus() }, 100)
    }

    const handleSubmitReview = async () => {
        setIsSubmittingReview(true)
        try { await submitReview(joinCode, rating, reviewComment, character?.name || 'Player'); alert("Thank you for your feedback!"); router.push('/') }
        catch (error) { alert("Failed to submit review"); setIsSubmittingReview(false) }
    }

    const activeImageUrl = (() => {
        if (privateSceneId) { const ps = campaignScenes.find(s => s.id === privateSceneId); if (ps) return ps.imageUrl }
        return gameState?.sceneImageUrl || "https://img.freepik.com/premium-photo/majestic-misty-redwood-forest-with-lush-green-ferns-sunlight-filtering-through-fog_996993-7424.jpg"
    })()
    const activeDescription = announcement || gmNarration || sceneNotification || undefined

    // ✅ LIVEKIT WRAPPER
    return (
        <LiveKitRoom
            token={voiceToken}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            data-lk-theme="default"
            connect={!!voiceToken}
            audio={true}
            video={false}
            style={{ height: '100dvh' }}
        >
            <div className="h-[100dvh] bg-slate-950 text-white flex flex-col font-sans overflow-hidden">

                {/* 1. HEADER */}
                <div className="bg-slate-900 border-b border-amber-500/30 flex flex-col gap-2 p-2 shrink-0 z-30 shadow-lg relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full border-2 border-amber-500 bg-slate-800 overflow-hidden">
                                {character && <img src={character.avatarUrl} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                                <div className="font-bold text-amber-500 text-sm">{character?.name || 'Loading...'}</div>
                                <div className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded inline-block">{playerName || 'Player'}</div>
                            </div>
                        </div>
                        {/* HP/MP Bars */}
                        <div className="w-24 flex flex-col gap-1">
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full w-full" /></div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-500 h-full w-3/4" /></div>
                        </div>
                    </div>
                </div>

                {/* 2. SCENE */}
                <div className="h-[30vh] relative bg-black shrink-0 shadow-md z-10 transition-all duration-300">
                    <SceneDisplay sceneDescription={activeDescription} imageUrl={activeImageUrl} npcs={gameState?.activeNpcs || []} />
                </div>

                {/* 3. LOG */}
                <div className="flex-1 bg-slate-950 flex flex-col min-h-0 relative">
                    <div ref={logContainerRef} className="flex-1 p-3 overflow-y-auto custom-scrollbar scroll-smooth">
                        <GameLog logs={logs} />
                    </div>
                </div>

                {/* 4. CONTROLS */}
                <div className="bg-slate-900 border-t border-slate-800 shrink-0 z-20 pb-safe">
                    <div className="flex border-b border-slate-800">
                        <button onClick={() => setActiveTab('ACTIONS')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'ACTIONS' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500'}`}>Actions</button>
                        <button onClick={() => setActiveTab('CHARACTER')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'CHARACTER' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500'}`}>Character</button>
                        <button onClick={() => setActiveTab('INVENTORY')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'INVENTORY' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500'}`}>Inventory ({inventory.length})</button>
                    </div>

                    <div className="h-[200px] p-3 overflow-y-auto custom-scrollbar">
                        {activeTab === 'ACTIONS' ? (
                            <>
                                {/* ✅ Push to Talk Button (วางไว้ตรงนี้เพื่อให้กดง่ายๆ) */}
                                <div className="flex flex-col items-center mb-3">
                                    <VoicePTTButton />
                                </div>

                                {/* Custom Action Input */}
                                <div className="flex gap-2">
                                    <input ref={inputRef} value={customAction} onChange={e => setCustomAction(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendCustomAction()} placeholder="Type action..." className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
                                    <button onClick={sendCustomAction} className="bg-amber-600 px-4 rounded text-black font-bold">GO</button>
                                </div>
                            </>
                        ) : activeTab === 'CHARACTER' ? (
                            <div className="space-y-3">
                                {character?.sheetType === 'ROLE_AND_ROLL' ? (
                                    <>
                                        {/* Vitals */}
                                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                            <h3 className="text-purple-400 font-bold mb-2 text-sm uppercase flex items-center gap-2"><span>⚡</span> Vitals</h3>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div><div className="text-[10px] text-slate-400">HP</div><div className="text-xl font-bold text-green-400">{character?.stats?.vitals?.health || 0}/{character?.stats?.vitals?.maxHealth || 0}</div></div>
                                                <div><div className="text-[10px] text-slate-400">MP</div><div className="text-xl font-bold text-blue-400">{character?.stats?.vitals?.mental || 0}/{character?.stats?.vitals?.maxMental || 0}</div></div>
                                                <div><div className="text-[10px] text-slate-400">WP</div><div className="text-xl font-bold text-purple-400">{character?.stats?.vitals?.willPower || 0}</div></div>
                                            </div>
                                        </div>
                                        {/* Attributes */}
                                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                            <h3 className="text-amber-500 font-bold mb-3 text-sm uppercase">Attributes</h3>
                                            <div className="grid grid-cols-3 gap-2">
                                                <StatDisplay label="STR" value={character?.stats?.attributes?.Strength || 0} />
                                                <StatDisplay label="DEX" value={character?.stats?.attributes?.Dexterity || 0} />
                                                <StatDisplay label="TGH" value={character?.stats?.attributes?.Toughness || 0} />
                                                <StatDisplay label="INT" value={character?.stats?.attributes?.Intellect || 0} />
                                                <StatDisplay label="APT" value={character?.stats?.attributes?.Aptitude || 0} />
                                                <StatDisplay label="SAN" value={character?.stats?.attributes?.Sanity || 0} />
                                                <StatDisplay label="CHR" value={character?.stats?.attributes?.Charm || 0} />
                                                <StatDisplay label="RHE" value={character?.stats?.attributes?.Rhetoric || 0} />
                                                <StatDisplay label="EGO" value={character?.stats?.attributes?.Ego || 0} />
                                            </div>
                                        </div>
                                        {/* Abilities */}
                                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 max-h-[150px] overflow-y-auto custom-scrollbar">
                                            <h3 className="text-cyan-400 font-bold mb-3 text-sm uppercase">Abilities {character?.stats?.abilities && `(${Object.keys(character.stats.abilities).length})`}</h3>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {character?.stats?.abilities && Object.entries(character.stats.abilities).map(([name, value]: [string, any]) => (
                                                    <div key={name} className="flex justify-between items-center bg-slate-900 rounded px-2 py-1"><span className="text-slate-300">{name}</span><span className="text-cyan-400 font-bold">+{value}</span></div>
                                                ))}
                                                {(!character?.stats?.abilities || Object.keys(character.stats.abilities).length === 0) && <div className="col-span-2 text-center text-slate-500 text-xs py-2">No abilities</div>}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                            <h3 className="text-amber-500 font-bold mb-3 text-sm uppercase">Stats</h3>
                                            <div className="grid grid-cols-3 gap-3">
                                                <StatDisplay label="STR" value={character?.stats?.STR || character?.stats?.str || 0} />
                                                <StatDisplay label="DEX" value={character?.stats?.DEX || character?.stats?.dex || 0} />
                                                <StatDisplay label="CON" value={character?.stats?.CON || character?.stats?.con || 0} />
                                                <StatDisplay label="INT" value={character?.stats?.INT || character?.stats?.int || 0} />
                                                <StatDisplay label="WIS" value={character?.stats?.WIS || character?.stats?.wis || 0} />
                                                <StatDisplay label="CHA" value={character?.stats?.CHA || character?.stats?.cha || 0} />
                                            </div>
                                        </div>
                                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                            <h3 className="text-purple-400 font-bold mb-2 text-sm uppercase flex items-center gap-2"><span>⚡</span> WILL Power</h3>
                                            <div className="text-3xl font-black text-white text-center">{character?.stats?.willPower || 0}</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2">
                                {inventory.map((item, idx) => (
                                    <button key={idx} onClick={() => setSelectedItemDetail(item)} className="aspect-square bg-slate-800 border border-slate-700 rounded flex items-center justify-center text-2xl">{item.icon || '📦'}</button>
                                ))}
                                {inventory.length === 0 && <div className="col-span-4 text-center text-slate-600 text-xs py-4">Empty Inventory</div>}
                            </div>
                        )}
                    </div>
                </div>

                {/* MODALS */}
                {showReviewModal && (
                    <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
                        <div className="bg-slate-900 w-full max-w-sm p-8 rounded-2xl border-2 border-amber-500 text-center">
                            <div className="text-5xl mb-4">🏆</div>
                            <h2 className="text-2xl font-bold text-white mb-2">Session Ended</h2>
                            <p className="text-slate-400 mb-6">How was your adventure?</p>
                            <div className="flex justify-center gap-2 mb-6">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} onClick={() => setRating(star)} className={`text-4xl ${rating >= star ? 'text-amber-400' : 'text-slate-700'}`}>★</button>
                                ))}
                            </div>
                            <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white mb-6 h-24 resize-none" placeholder="Leave a comment" />
                            <button onClick={handleSubmitReview} disabled={isSubmittingReview} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl disabled:opacity-50">{isSubmittingReview ? 'Sending...' : 'SUBMIT REVIEW'}</button>
                        </div>
                    </div>
                )}

                {selectedItemDetail && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-6" onClick={() => setSelectedItemDetail(null)}>
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-600 w-full max-w-xs text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="text-4xl mb-2">{selectedItemDetail.icon || '📦'}</div>
                            <h3 className="font-bold text-amber-500">{selectedItemDetail.name}</h3>
                            <p className="text-sm text-slate-400 my-2">{selectedItemDetail.description}</p>
                            <div className="flex items-center justify-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsPrivateAction(!isPrivateAction)}>
                                <div className={`w-5 h-5 border rounded flex items-center justify-center ${isPrivateAction ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-500 bg-slate-800'}`}>✓</div>
                                <span className="text-sm text-slate-300 select-none">Private Action (GM Only)</span>
                            </div>
                            <button className={`px-4 py-3 rounded text-white text-sm w-full font-bold shadow-lg active:scale-95 ${isPrivateAction ? 'bg-indigo-600' : 'bg-blue-600'}`} onClick={() => {
                                sendPlayerAction({ actionType: 'use_item', actorId: playerId, payload: { itemId: selectedItemDetail.id, itemName: selectedItemDetail.name, isPrivate: isPrivateAction }, actorName: character.name, description: `used ${selectedItemDetail.name}`, isPrivate: isPrivateAction } as any);
                                setSelectedItemDetail(null); setIsPrivateAction(false);
                            }}>{isPrivateAction ? 'USE PRIVATELY' : 'USE ITEM'}</button>
                        </div>
                    </div>
                )}

                {isRnRRolling && <RnRRoller attributeValue={currentRnRAction.includes('Check') ? getRnRModifiersForCheck(character?.stats, currentRnRAction).attributeValue : getRnRModifiersForAction(character?.stats, currentRnRAction).attributeValue} attributeName={currentRnRAction.includes('Check') ? getRnRModifiersForCheck(character?.stats, currentRnRAction).attributeName : getRnRModifiersForAction(character?.stats, currentRnRAction).attributeName} availableAbilities={getRelevantAbilities(character?.stats, currentRnRAction.includes('Check') ? getRnRModifiersForCheck(character?.stats, currentRnRAction).attributeName : getRnRModifiersForAction(character?.stats, currentRnRAction).attributeName)} characterName={character?.name} availableWillPower={character?.stats?.vitals?.willPower || character?.stats?.willPower || 0} onComplete={handleRnRComplete} onStepUpdate={handleRnRStepUpdate} onCancel={() => { setIsRnRRolling(false); setIsRequestedRoll(false); }} />}

                {rollRequest && (
                    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
                        <div className="bg-slate-900 p-6 rounded-2xl border-2 border-amber-500 w-full max-w-xs text-center">
                            <h2 className="text-xl font-bold text-white">GM Orders Roll!</h2>
                            <div className="text-amber-500 text-2xl font-black my-4">{rollRequest.checkType}</div>
                            <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
                                <div className="flex justify-between items-center mb-2"><span className="text-xs text-slate-400 font-bold">⚡ WILL BOOST</span><span className="text-xs text-amber-400">Available: {character?.stats?.willPower || 0}</span></div>
                                <input type="number" min="0" max={character?.stats?.willPower || 0} value={willBoost} onChange={(e) => setWillBoost(Math.min(Number(e.target.value), character?.stats?.willPower || 0))} className="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 text-center text-white font-bold focus:border-amber-500 outline-none" placeholder="0" />
                                <div className="text-[10px] text-slate-500 mt-2">1 WILL = +1 to roll</div>
                            </div>
                            <div className="bg-slate-950 rounded-lg p-3 mb-4 text-xs text-slate-300"><div>Total = Roll + {getStatModifier(rollRequest.checkType)} (stat) + {willBoost} (WILL)</div></div>
                            <button onClick={handleRollResponse} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl">ROLL D20</button>
                        </div>
                    </div>
                )}

                {/* ✅ ตัวเล่นเสียง (ห้ามลบ) */}
                <RoomAudioRenderer />

            </div>
        </LiveKitRoom>
    )
}

const StatDisplay = ({ label, value }: { label: string, value: number }) => {
    return (
        <div className="bg-slate-950 rounded-lg p-2 text-center border border-slate-600">
            <div className="text-[10px] text-slate-400 font-bold uppercase">{label}</div>
            <div className="text-xl font-black text-white">{value}</div>
        </div>
    )
}