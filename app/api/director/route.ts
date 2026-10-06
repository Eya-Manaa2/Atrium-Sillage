import { stepCountIs, tool, ToolLoopAgent } from 'ai'
import { z } from 'zod'
import { caseSchema, MODEL, ROOM_IDS, ROOMS, roomSchema } from '@/lib/game/schema'

export const maxDuration = 60

const bodySchema = z.object({
  gameCase: caseSchema,
  playerRoom: roomSchema,
  suspectRooms: z.record(roomSchema),
  clueRooms: z.record(roomSchema.nullable()),
  discoveredClueIds: z.array(z.string()),
  stress: z.record(z.number()),
  turnsLeft: z.number(),
  recentLog: z.array(z.string()),
})

export type DirectorAction =
  | { type: 'moveSuspect'; suspectId: string; room: (typeof ROOM_IDS)[number]; narration: string }
  | { type: 'hideClue'; clueId: string; room: (typeof ROOM_IDS)[number]; narration: string }
  | { type: 'ambient'; narration: string }

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) return Response.json({ actions: [] })

  const s = parsed.data
  const culprit = s.gameCase.suspects.find((x) => x.id === s.gameCase.solution.culpritId)
  const actions: DirectorAction[] = []
  const canAct = () => actions.length < 3

  const director = new ToolLoopAgent({
    model: MODEL,
    stopWhen: stepCountIs(4),
    instructions: `Tu es le Maître du Manoir, l'agent qui fait vivre la maison entre les actions du détective.
Tu fais bouger les suspects de façon crédible selon leur personnalité et leur stress, tu crées l'atmosphère, et tu peux faire agir le coupable en secret.
Règles :
- Effectue entre 1 et 3 actions avec tes outils, puis termine.
- Narrations courtes (1 phrase), en français, au présent, style roman noir. Les narrations sont ce que le détective perçoit : ne révèle jamais l'identité du coupable.
- hideClue : uniquement pour le coupable, avec parcimonie (pas plus d'une fois tous les deux tours), et seulement sur un indice physique non découvert. La narration doit rester vague (un bruit, une porte qui claque).
- Un suspect très stressé (>70) a tendance à fuir la pièce du détective.`,
    tools: {
      moveSuspect: tool({
        description: 'Déplacer un suspect vers une autre pièce.',
        inputSchema: z.object({ suspectId: z.string(), room: z.enum(ROOM_IDS), narration: z.string() }),
        execute: async ({ suspectId, room, narration }) => {
          if (!canAct() || !s.suspectRooms[suspectId]) return 'refusé'
          actions.push({ type: 'moveSuspect', suspectId, room, narration })
          return 'ok'
        },
      }),
      hideClue: tool({
        description: 'Le coupable déplace en secret un indice physique non découvert vers une autre pièce.',
        inputSchema: z.object({ clueId: z.string(), room: z.enum(ROOM_IDS), narration: z.string() }),
        execute: async ({ clueId, room, narration }) => {
          const movable = s.clueRooms[clueId] && !s.discoveredClueIds.includes(clueId)
          if (!canAct() || !movable || actions.some((a) => a.type === 'hideClue')) return 'refusé'
          actions.push({ type: 'hideClue', clueId, room, narration })
          return 'ok'
        },
      }),
      ambientEvent: tool({
        description: "Décrire un événement d'ambiance perceptible par le détective.",
        inputSchema: z.object({ narration: z.string() }),
        execute: async ({ narration }) => {
          if (!canAct()) return 'refusé'
          actions.push({ type: 'ambient', narration })
          return 'ok'
        },
      }),
    },
  })

  const suspectsState = s.gameCase.suspects
    .map((x) => `- ${x.id} ${x.name} (${x.role}) : ${ROOMS[s.suspectRooms[x.id] ?? x.startRoom].label}, stress ${s.stress[x.id] ?? 20}`)
    .join('\n')
  const physicalClues = s.gameCase.clues
    .filter((c) => s.clueRooms[c.id] && !s.discoveredClueIds.includes(c.id))
    .map((c) => `- ${c.id} ${c.title} : ${ROOMS[s.clueRooms[c.id]!].label}`)
    .join('\n')

  try {
    await director.generate({
      prompt: `Affaire : ${s.gameCase.title}. Coupable (secret) : ${culprit?.id} ${culprit?.name}.
Le détective est dans : ${ROOMS[s.playerRoom].label}. Tours restants : ${s.turnsLeft}.
Suspects :
${suspectsState}
Indices physiques non découverts :
${physicalClues || '- aucun'}
Derniers événements :
${s.recentLog.join('\n') || '- début de l’enquête'}

Fais vivre le manoir maintenant.`,
    })
  } catch (error) {
    console.error('[director] failed', error)
  }

  return Response.json({ actions })
}
