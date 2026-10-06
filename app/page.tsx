"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BookOpen, Map, MessageSquare, Scale, Settings, Search } from "lucide-react"
import IsoRoom, { type RoomPreset } from "@/components/iso-room"
import WindowFrame from "@/components/window-frame"
import InterrogatePanel from "@/components/interrogate-panel"
import styles from "@/styles/habbo.module.css"
import { useGame, TOTAL_TURNS } from "@/hooks/use-game"
import { ROOMS, ROOM_IDS, type RoomId } from "@/lib/game/schema"
import { Textarea } from "@/components/ui/textarea"

function visualRoom(id: RoomId): RoomPreset {
  if (id === "hall" || id === "library") return "Lobby"
  if (id === "salon" || id === "kitchen") return "Café"
  return "Rooftop"
}

const NPC_TILES = [
  { x: 5, y: 8, facing: "S" as const },
  { x: 12, y: 6, facing: "W" as const },
  { x: 9, y: 11, facing: "N" as const },
  { x: 14, y: 10, facing: "E" as const },
]

const NPC_COLORS = ["#b91c1c", "#1d4ed8", "#a16207", "#0f766e"]

export default function Page() {
  const { state, dispatch, startCase, moveTo, search, spendTurn, accuse } = useGame()
  const [navOpen, setNavOpen] = useState(true)
  const [dossierOpen, setDossierOpen] = useState(true)
  const [talkOpen, setTalkOpen] = useState(false)
  const [accuseOpen, setAccuseOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reasoning, setReasoning] = useState("")
  const [accuseId, setAccuseId] = useState("")
  const [displayName, setDisplayName] = useState("Détective")

  useEffect(() => {
    try {
      const n = localStorage.getItem("as_name")
      if (n) setDisplayName(n)
    } catch {
      /* ignore */
    }
  }, [])

  const suspectsHere = useMemo(() => {
    if (!state.gameCase) return []
    return state.gameCase.suspects.filter((s) => state.suspectRooms[s.id] === state.playerRoom)
  }, [state.gameCase, state.playerRoom, state.suspectRooms])

  const npcPeers = useMemo(
    () =>
      suspectsHere.map((s, i) => {
        const tile = NPC_TILES[i % NPC_TILES.length]
        const idx = state.gameCase?.suspects.findIndex((x) => x.id === s.id) ?? i
        return {
          id: s.id,
          name: s.name.split(" ")[0],
          color: NPC_COLORS[idx % NPC_COLORS.length],
          x: tile.x,
          y: tile.y,
          facing: tile.facing,
        }
      }),
    [suspectsHere, state.gameCase],
  )

  const foundClues = useMemo(() => {
    if (!state.gameCase) return []
    return state.gameCase.clues.filter((c) => state.discovered.includes(c.id))
  }, [state.gameCase, state.discovered])

  const onNpcClick = useCallback(
    (id: string) => {
      if (!state.gameCase || state.phase !== "playing") return
      if (!state.gameCase.suspects.some((s) => s.id === id)) return
      dispatch({ type: "interrogate", suspectId: id })
      setTalkOpen(true)
    },
    [dispatch, state.gameCase, state.phase],
  )

  const activeSuspect = state.gameCase?.suspects.find((s) => s.id === state.activeSuspect)

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#9bbad3]">
      <header className="border-b border-black/40 bg-[#2f2f2f]">
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-3">
          <div className={styles.logoBlock} aria-label="Atrium Sillage">
            <span className={styles.logoWord}>ATRIUM SILLAGE</span>
          </div>
          <Separator orientation="vertical" className="h-6 bg-black/50" />
          <div className="text-sm text-white/80 hidden sm:block">
            {state.phase === "playing" && state.gameCase
              ? `${ROOMS[state.playerRoom].label} — ${state.turnsLeft} tours — ${state.gameCase.title}`
              : "Enquête agentique"}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className={styles.pixelButton} onClick={() => setNavOpen((v) => !v)}>
              <Map className="w-4 h-4" /> Navigator
            </Button>
            <Button variant="outline" className={styles.pixelButton} onClick={() => setDossierOpen((v) => !v)}>
              <BookOpen className="w-4 h-4" /> Dossier
            </Button>
            <Button
              variant="outline"
              className={styles.pixelButton}
              onClick={() => setAccuseOpen((v) => !v)}
              disabled={state.phase !== "playing"}
            >
              <Scale className="w-4 h-4" /> Accuser
            </Button>
            <Button variant="outline" className={styles.pixelButton} onClick={() => setSettingsOpen((v) => !v)}>
              <Settings className="w-4 h-4" /> Settings
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto p-4">
          <div className={styles.playFrame}>
            <div className="relative w-full h-[70vh] min-h-[520px]">
              {state.phase === "intro" || state.phase === "generating" ? (
                <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#1f2937]/20">
                  <div className="max-w-lg bg-white border-2 border-black/40 rounded-md p-5 shadow-lg space-y-3">
                    <div className="text-lg font-bold">Atrium Sillage</div>
                    <p className="text-[13px] leading-relaxed text-black/80">
                      Hôtel Art déco, nuit d&apos;orage. Des PNJ IA vivent, mentent et se déplacent pendant que vous
                      fouillez les pièces. Interrogez-les, collectez six pistes, accusez avant la fin des {TOTAL_TURNS}{" "}
                      tours. Pas de musique — seulement le silence du hall.
                    </p>
                    {state.error && <p className="text-[12px] text-red-700">{state.error}</p>}
                    <Button className={styles.goButton} onClick={() => void startCase()} disabled={state.phase === "generating"}>
                      {state.phase === "generating" ? "Ouverture de l’affaire…" : "Ouvrir une affaire"}
                    </Button>
                  </div>
                </div>
              ) : (
                <IsoRoom
                  key={state.playerRoom}
                  room={visualRoom(state.playerRoom)}
                  selfName={displayName}
                  peers={npcPeers}
                  onNpcClick={onNpcClick}
                />
              )}
              {state.phase === "playing" && (
                <div className="absolute bottom-2 left-2 text-[11px] text-black/80 rounded-md border border-black/30 bg-white/90 px-2 py-1 shadow-sm">
                  Cliquez un PNJ pour l’interroger. Navigator pour changer de pièce (1 tour). Fouiller coûte 1 tour.
                </div>
              )}
              {state.directorThinking && (
                <div className="absolute top-2 right-2 text-[11px] bg-black/80 text-white px-2 py-1 rounded">
                  Le hall respire…
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {state.phase === "ended" && state.verdict && (
        <WindowFrame
          id="verdict"
          title={state.verdict.correct ? "Affaire classée" : "Erreur judiciaire"}
          variant="habbo"
          initial={{ x: 80, y: 80, w: 480, h: 420 }}
          onClose={() => dispatch({ type: "reset" })}
          ariaTitle="Verdict"
        >
          <div className="p-3 space-y-2 text-[13px] overflow-y-auto h-full">
            <p>
              Vous avez accusé <strong>{state.verdict.accusedName}</strong>
              {state.verdict.correct ? " — c’était juste." : ` — le coupable était ${state.verdict.culpritName}.`}
            </p>
            <p>
              <strong>Mobile :</strong> {state.verdict.motive}
            </p>
            <p>
              <strong>Méthode :</strong> {state.verdict.method}
            </p>
            <p className="whitespace-pre-wrap text-black/80">{state.verdict.epilogue}</p>
            <Button className={styles.goButton} onClick={() => dispatch({ type: "reset" })}>
              Nouvelle affaire
            </Button>
          </div>
        </WindowFrame>
      )}

      {navOpen && state.phase === "playing" && (
        <WindowFrame
          id="navigator"
          title="Atrium Navigator"
          variant="habbo"
          initial={{ x: 16, y: 72, w: 380, h: 560 }}
          onClose={() => setNavOpen(false)}
          ariaTitle="Navigator"
        >
          <div className="p-0 h-full flex flex-col">
            <div className={styles.tabBar}>
              <div className={styles.tabActive}>Pièces publiques</div>
              <div className={styles.tab}>Suites</div>
            </div>
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <div className="text-[12px] text-black/80">Atrium Sillage</div>
              <Button size="sm" className={styles.goButton} onClick={() => search()}>
                <Search className="w-4 h-4" /> Fouiller
              </Button>
            </div>
            <div className="px-3 pb-3 space-y-2 overflow-y-auto flex-1">
              {ROOM_IDS.map((id) => {
                const count = state.gameCase?.suspects.filter((s) => state.suspectRooms[s.id] === id).length ?? 0
                return (
                  <div key={id} className={styles.navRow}>
                    <div className={styles.navDot} />
                    <div className="truncate">
                      {ROOMS[id].label}
                      {id === state.playerRoom ? " (vous)" : ""}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <div className={styles.statusPill}>{count} PNJ</div>
                      <Button size="sm" className={styles.goButton} onClick={() => moveTo(id)} disabled={id === state.playerRoom}>
                        Go
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-auto border-t border-black/20 text-[11px] text-black/70 px-3 py-2">
              Déplacez-vous dans la pièce au clic / WASD. Changer de pièce ou fouiller consomme un tour.
              {hereHint(suspectsHere.map((s) => s.name))}
            </div>
          </div>
        </WindowFrame>
      )}

      {dossierOpen && state.phase === "playing" && state.gameCase && (
        <WindowFrame
          id="dossier"
          title="Dossier"
          variant="habbo"
          initial={{ x: 400, y: 88, w: 380, h: 420 }}
          onClose={() => setDossierOpen(false)}
          ariaTitle="Dossier"
        >
          <div className="p-3 h-full overflow-y-auto space-y-3 text-[12px]">
            <div>
              <div className="font-semibold">{state.gameCase.title}</div>
              <p className="text-black/75 mt-1">{state.gameCase.intro}</p>
              <p className="mt-1">
                Victime : {state.gameCase.victim.name} — {state.gameCase.timeOfCrime}, {ROOMS[state.gameCase.crimeRoom].label}.
              </p>
            </div>
            <div>
              <div className="font-semibold">Indices ({foundClues.length}/6)</div>
              {foundClues.length === 0 && <p className="text-black/55">Rien de classé. Fouillez, ou faites parler un PNJ.</p>}
              {foundClues.map((c) => (
                <div key={c.id} className="border border-black/15 rounded px-2 py-1 mt-1 bg-white/80">
                  <div className="font-semibold">{c.title}</div>
                  <div>{c.description}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold">Journal</div>
              <div className="space-y-1 mt-1 max-h-40 overflow-y-auto">
                {state.log.slice(-18).map((l) => (
                  <div key={l.id} className="text-black/70">
                    {l.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </WindowFrame>
      )}

      {talkOpen && state.phase === "playing" && state.gameCase && activeSuspect && (
        <WindowFrame
          id="interro"
          title={`Interrogatoire — ${activeSuspect.name}`}
          variant="habbo"
          initial={{ x: 420, y: 120, w: 400, h: 400 }}
          onClose={() => {
            dispatch({ type: "interrogate", suspectId: null })
            setTalkOpen(false)
          }}
          ariaTitle="Interrogatoire"
        >
          <InterrogatePanel
            key={activeSuspect.id}
            gameCase={state.gameCase}
            suspectId={activeSuspect.id}
            discoveredClueIds={state.discovered}
            stress={state.stress[activeSuspect.id] ?? 20}
            room={state.playerRoom}
            onQuestion={spendTurn}
            onRevealClue={(clueId, source) => dispatch({ type: "discover", clueId, source })}
            onStress={(suspectId, stress) => dispatch({ type: "setStress", suspectId, stress })}
            onLeave={(suspectId, room, excuse) => {
              dispatch({ type: "suspectLeaves", suspectId, room: room as RoomId, excuse })
              setTalkOpen(false)
            }}
          />
        </WindowFrame>
      )}

      {talkOpen && state.phase === "playing" && !activeSuspect && (
        <WindowFrame
          id="interro-empty"
          title="Interrogatoire"
          variant="habbo"
          initial={{ x: 420, y: 120, w: 360, h: 180 }}
          onClose={() => setTalkOpen(false)}
          ariaTitle="Interrogatoire"
        >
          <div className="p-3 text-[13px] flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Personne à interroger ici. Changez de pièce ou cliquez un PNJ dans le hall.
          </div>
        </WindowFrame>
      )}

      {accuseOpen && state.phase === "playing" && state.gameCase && (
        <WindowFrame
          id="accuse"
          title="Accuser"
          variant="habbo"
          initial={{ x: 760, y: 88, w: 360, h: 340 }}
          onClose={() => setAccuseOpen(false)}
          ariaTitle="Accuser"
        >
          <div className="p-3 flex flex-col gap-2 h-full">
            <div className="text-[12px]">Choisissez un coupable et justifiez. Ceci clôt l’affaire.</div>
            <select
              className={styles.pixelInput}
              value={accuseId}
              onChange={(e) => setAccuseId(e.target.value)}
            >
              <option value="">— suspect —</option>
              {state.gameCase.suspects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
            <Textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Mobile, méthode, indices…"
              className="min-h-[120px] text-[13px]"
              maxLength={1200}
            />
            <Button
              className={styles.goButton}
              disabled={!accuseId}
              onClick={() => {
                void accuse(accuseId, reasoning)
                setAccuseOpen(false)
              }}
            >
              Porter l’accusation
            </Button>
          </div>
        </WindowFrame>
      )}

      {settingsOpen && (
        <WindowFrame
          id="settings"
          title="Settings"
          variant="habbo"
          initial={{ x: 780, y: 88, w: 320, h: 180 }}
          onClose={() => setSettingsOpen(false)}
          ariaTitle="Settings"
        >
          <div className="p-3 flex flex-col gap-3">
            <div className="text-[13px] font-semibold">Identité</div>
            <input
              className={styles.pixelInput}
              value={displayName}
              maxLength={24}
              onChange={(e) => {
                const v = e.target.value
                setDisplayName(v)
                try {
                  localStorage.setItem("as_name", v)
                } catch {
                  /* ignore */
                }
              }}
            />
            <div className="text-[11px] text-black/60">Aucune musique. L’Atrium Sillage se joue en silence.</div>
          </div>
        </WindowFrame>
      )}
    </div>
  )
}

function hereHint(names: string[]) {
  if (!names.length) return " Personne dans cette pièce."
  return ` Présents : ${names.join(", ")}.`
}
