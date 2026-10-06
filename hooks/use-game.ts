'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { DirectorAction } from '@/app/api/director/route'
import { ROOMS, type GameCase, type RoomId } from '@/lib/game/schema'
import { FALLBACK_CASE } from '@/lib/game/fallback-case'

export const TOTAL_TURNS = 30
const DIRECTOR_EVERY = 3

export type LogKind = 'move' | 'search' | 'clue' | 'director' | 'talk' | 'system'
export type LogEntry = { id: string; kind: LogKind; text: string; turn: number }

export type Verdict = {
  correct: boolean
  accusedName: string
  culpritName: string
  motive: string
  method: string
  epilogue: string
}

export type GameState = {
  phase: 'intro' | 'generating' | 'playing' | 'ended'
  gameCase: GameCase | null
  playerRoom: RoomId
  suspectRooms: Record<string, RoomId>
  clueRooms: Record<string, RoomId | null>
  discovered: string[]
  stress: Record<string, number>
  turnsLeft: number
  log: LogEntry[]
  activeSuspect: string | null
  directorThinking: boolean
  verdict: Verdict | null
  error: string | null
}

type Action =
  | { type: 'generate' }
  | { type: 'caseReady'; gameCase: GameCase }
  | { type: 'error'; message: string }
  | { type: 'move'; room: RoomId }
  | { type: 'search' }
  | { type: 'spendTurn' }
  | { type: 'discover'; clueId: string; source: string }
  | { type: 'setStress'; suspectId: string; stress: number }
  | { type: 'suspectLeaves'; suspectId: string; room: RoomId; excuse: string }
  | { type: 'interrogate'; suspectId: string | null }
  | { type: 'directorThinking'; value: boolean }
  | { type: 'director'; actions: DirectorAction[] }
  | { type: 'verdict'; verdict: Verdict }
  | { type: 'reset' }

const initialState: GameState = {
  phase: 'intro',
  gameCase: null,
  playerRoom: 'hall',
  suspectRooms: {},
  clueRooms: {},
  discovered: [],
  stress: {},
  turnsLeft: TOTAL_TURNS,
  log: [],
  activeSuspect: null,
  directorThinking: false,
  verdict: null,
  error: null,
}

let logCounter = 0
function entry(kind: LogKind, text: string, state: GameState): LogEntry {
  logCounter += 1
  return { id: `log-${logCounter}`, kind, text, turn: TOTAL_TURNS - state.turnsLeft }
}

function suspectName(state: GameState, id: string) {
  return state.gameCase?.suspects.find((s) => s.id === id)?.name ?? 'Quelqu’un'
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'generate':
      return { ...initialState, phase: 'generating' }
    case 'error':
      return { ...state, phase: 'intro', error: action.message }
    case 'caseReady': {
      const { gameCase } = action
      const base: GameState = {
        ...initialState,
        phase: 'playing',
        gameCase,
        suspectRooms: Object.fromEntries(gameCase.suspects.map((s) => [s.id, s.startRoom])),
        clueRooms: Object.fromEntries(gameCase.clues.map((c) => [c.id, c.room])),
        stress: Object.fromEntries(gameCase.suspects.map((s) => [s.id, 20])),
      }
      return {
        ...base,
        log: [
          entry('system', `${gameCase.victim.name} a été retrouvé·e sans vie (${ROOMS[gameCase.crimeRoom].label}, ${gameCase.timeOfCrime}).`, base),
        ],
      }
    }
    case 'move':
      if (action.room === state.playerRoom) return state
      return {
        ...state,
        playerRoom: action.room,
        activeSuspect: null,
        log: [...state.log, entry('move', `Vous entrez dans : ${ROOMS[action.room].label}.`, state)],
      }
    case 'search': {
      const found = Object.entries(state.clueRooms)
        .filter(([id, room]) => room === state.playerRoom && !state.discovered.includes(id))
        .map(([id]) => id)
      const titles = found.map((id) => state.gameCase?.clues.find((c) => c.id === id)?.title).filter(Boolean)
      return {
        ...state,
        discovered: [...state.discovered, ...found],
        log: [
          ...state.log,
          entry(
            found.length ? 'clue' : 'search',
            found.length
              ? `Fouille fructueuse : ${titles.join(', ')}.`
              : `Vous fouillez ${ROOMS[state.playerRoom].label} sans rien trouver de nouveau.`,
            state,
          ),
        ],
      }
    }
    case 'spendTurn':
      return { ...state, turnsLeft: Math.max(0, state.turnsLeft - 1) }
    case 'discover': {
      if (state.discovered.includes(action.clueId)) return state
      const clue = state.gameCase?.clues.find((c) => c.id === action.clueId)
      return {
        ...state,
        discovered: [...state.discovered, action.clueId],
        log: [...state.log, entry('clue', `${action.source} vous révèle : ${clue?.title ?? 'un indice'}.`, state)],
      }
    }
    case 'setStress':
      return { ...state, stress: { ...state.stress, [action.suspectId]: action.stress } }
    case 'suspectLeaves':
      return {
        ...state,
        activeSuspect: null,
        suspectRooms: { ...state.suspectRooms, [action.suspectId]: action.room },
        log: [
          ...state.log,
          entry('talk', `${suspectName(state, action.suspectId)} quitte la pièce : « ${action.excuse} »`, state),
        ],
      }
    case 'interrogate':
      return { ...state, activeSuspect: action.suspectId }
    case 'directorThinking':
      return { ...state, directorThinking: action.value }
    case 'director': {
      let next = { ...state, suspectRooms: { ...state.suspectRooms }, clueRooms: { ...state.clueRooms } }
      const newLogs: LogEntry[] = []
      for (const a of action.actions) {
        if (a.type === 'moveSuspect' && next.suspectRooms[a.suspectId]) {
          next.suspectRooms[a.suspectId] = a.room
          if (next.activeSuspect === a.suspectId) next.activeSuspect = null
        }
        if (a.type === 'hideClue' && next.clueRooms[a.clueId] && !next.discovered.includes(a.clueId)) {
          next.clueRooms[a.clueId] = a.room
        }
        newLogs.push(entry('director', a.narration, state))
      }
      next = { ...next, log: [...next.log, ...newLogs] }
      return next
    }
    case 'verdict':
      return { ...state, phase: 'ended', verdict: action.verdict }
    case 'reset':
      return initialState
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  const turnsUsed = useRef(0)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const runDirector = useCallback(async () => {
    const s = stateRef.current
    if (!s.gameCase || s.phase !== 'playing') return
    dispatch({ type: 'directorThinking', value: true })
    try {
      const res = await fetch('/api/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCase: s.gameCase,
          playerRoom: s.playerRoom,
          suspectRooms: s.suspectRooms,
          clueRooms: s.clueRooms,
          discoveredClueIds: s.discovered,
          stress: s.stress,
          turnsLeft: s.turnsLeft,
          recentLog: s.log.slice(-6).map((l) => l.text),
        }),
      })
      const data = (await res.json()) as { actions: DirectorAction[] }
      if (data.actions?.length) dispatch({ type: 'director', actions: data.actions })
    } catch (error) {
      console.error('[director] request failed', error)
    } finally {
      dispatch({ type: 'directorThinking', value: false })
    }
  }, [])

  const spendTurn = useCallback(() => {
    dispatch({ type: 'spendTurn' })
    turnsUsed.current += 1
    if (turnsUsed.current % DIRECTOR_EVERY === 0) {
      setTimeout(runDirector, 0)
    }
  }, [runDirector])

  const startCase = useCallback(async () => {
    dispatch({ type: 'generate' })
    turnsUsed.current = 0
    try {
      const res = await fetch('/api/case', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data?.suspects) throw new Error(data.error || 'Affaire invalide')
      dispatch({ type: 'caseReady', gameCase: data })
    } catch (error) {
      console.error('[case] client fallback', error)
      dispatch({ type: 'caseReady', gameCase: FALLBACK_CASE })
    }
  }, [])

  const moveTo = useCallback(
    (room: RoomId) => {
      if (room === stateRef.current.playerRoom || stateRef.current.turnsLeft <= 0) return
      dispatch({ type: 'move', room })
      spendTurn()
    },
    [spendTurn],
  )

  const search = useCallback(() => {
    if (stateRef.current.turnsLeft <= 0) return
    dispatch({ type: 'search' })
    spendTurn()
  }, [spendTurn])

  const accuse = useCallback(async (suspectId: string, reasoning: string) => {
    const s = stateRef.current
    if (!s.gameCase) return
    try {
      const res = await fetch('/api/accuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCase: s.gameCase, suspectId, reasoning, discoveredClueIds: s.discovered }),
      })
      const verdict = (await res.json()) as Verdict
      if (typeof verdict.correct === 'boolean') {
        dispatch({ type: 'verdict', verdict })
        return
      }
    } catch (error) {
      console.error('[accuse] failed', error)
    }
    const accused = s.gameCase.suspects.find((x) => x.id === suspectId)
    const culprit = s.gameCase.suspects.find((x) => x.id === s.gameCase!.solution.culpritId)
    const correct = suspectId === s.gameCase.solution.culpritId
    dispatch({
      type: 'verdict',
      verdict: {
        correct,
        accusedName: accused?.name ?? '',
        culpritName: culprit?.name ?? '',
        motive: s.gameCase.solution.motive,
        method: s.gameCase.solution.method,
        epilogue: correct
          ? `Le grand hall d’Atrium Sillage retient son souffle. ${accused?.name} baisse les yeux : la vérité colle aux tapis, comme un sillage trop fort.`
          : `Vous vous êtes trompé. ${culprit?.name} recule d’un pas, trop tard : le sillage de minuit le trahit malgré votre accusation.`,
      },
    })
  }, [])

  return { state, dispatch, startCase, moveTo, search, spendTurn, accuse }
}

export type GameDispatch = ReturnType<typeof useGame>['dispatch']
