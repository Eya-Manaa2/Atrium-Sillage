"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import styles from "@/styles/habbo.module.css"
import type { GameCase } from "@/lib/game/schema"

type ToolHooks = {
  onRevealClue: (clueId: string, source: string) => void
  onStress: (suspectId: string, stress: number) => void
  onLeave: (suspectId: string, room: string, excuse: string) => void
}

type Props = {
  gameCase: GameCase
  suspectId: string
  discoveredClueIds: string[]
  stress: number
  room: GameCase["suspects"][number]["startRoom"]
  onQuestion: () => void
} & ToolHooks

function textOf(message: { parts?: Array<{ type: string; text?: string }>; content?: string }) {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text as string)
      .join("\n")
  }
  return typeof message.content === "string" ? message.content : ""
}

export default function InterrogatePanel({
  gameCase,
  suspectId,
  discoveredClueIds,
  stress,
  room,
  onRevealClue,
  onStress,
  onLeave,
  onQuestion,
}: Props) {
  const suspect = gameCase.suspects.find((s) => s.id === suspectId)
  const extrasRef = useRef({ gameCase, suspectId, discoveredClueIds, stress, room })
  extrasRef.current = { gameCase, suspectId, discoveredClueIds, stress, room }

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/interrogate",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            ...extrasRef.current,
          },
        }),
      }),
    [],
  )

  const { messages, sendMessage, status, error } = useChat({
    id: `interro-${suspectId}`,
    transport,
  })

  const seenTools = useRef(new Set<string>())
  useEffect(() => {
    for (const m of messages) {
      const parts = (m as { parts?: Array<Record<string, unknown>> }).parts ?? []
      for (const part of parts) {
        const type = String(part.type ?? "")
        const state = String(part.state ?? "")
        if (state && state !== "output-available" && state !== "result") continue
        const output = (part.output ?? part.result) as Record<string, unknown> | undefined
        const key = `${m.id}:${type}:${JSON.stringify(output ?? {})}`
        if (seenTools.current.has(key)) continue
        if (type.includes("revealClue") && output?.ok && typeof output.clueId === "string") {
          seenTools.current.add(key)
          onRevealClue(output.clueId, suspect?.name ?? "Suspect")
        }
        if (type.includes("setComposure") && typeof output?.stress === "number") {
          seenTools.current.add(key)
          onStress(suspectId, output.stress)
        }
        if (type.includes("leaveRoom") && typeof output?.room === "string") {
          seenTools.current.add(key)
          onLeave(suspectId, output.room, String(output.excuse ?? "Excusez-moi."))
        }
      }
    }
  }, [messages, onLeave, onRevealClue, onStress, suspect?.name, suspectId])

  const [draft, setDraft] = useState("")
  const busy = status === "submitted" || status === "streaming"

  async function submit() {
    const t = draft.trim()
    if (!t || busy) return
    setDraft("")
    onQuestion()
    await sendMessage({ text: t })
  }

  const lines = messages
    .map((m) => ({ id: m.id, role: m.role, text: textOf(m as never) }))
    .filter((m) => m.text)

  return (
    <div className={styles.windowBody}>
      <div className="px-3 py-2 text-[12px] text-black/70">
        {suspect ? (
          <>
            Vous interrogez <span className="font-semibold">{suspect.name}</span> — {suspect.role}. Stress{" "}
            {Math.round(stress)}/100.
          </>
        ) : (
          "Personne ici."
        )}
      </div>
      <div className="px-3">
        <div className="h-px bg-black/20" />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {lines.length === 0 && (
          <div className="text-[12px] text-black/55">Posez une question. Soyez précis : alibi, odeurs, horaires, objets.</div>
        )}
        {lines.map((m) => (
          <div key={m.id} className="leading-snug">
            <div className="inline-block max-w-[94%] bg-white/90 border border-black/15 rounded px-2 py-1">
              <span className="font-semibold text-[12px]">{m.role === "user" ? "Vous" : suspect?.name}:</span>{" "}
              <span className="text-[13px] whitespace-pre-wrap break-words">{m.text}</span>
            </div>
          </div>
        ))}
        {busy && <div className="text-[11px] text-black/50">Le suspect réfléchit…</div>}
        {error && (
          <div className="text-[11px] text-red-700">
            L’agent PNJ n’a pas répondu ({error.message}). Vérifiez la clé API, ou relancez la question.
          </div>
        )}
      </div>
      <form
        className="p-3 flex flex-col gap-2 border-t border-black/15"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Que faisiez-vous à 23 h 40 ?"
            className={styles.pixelInput}
            onKeyDown={(e) => e.stopPropagation()}
            maxLength={400}
          />
          <Button type="submit" className={styles.goButton} disabled={busy}>
            Dire
          </Button>
        </div>
      </form>
    </div>
  )
}
