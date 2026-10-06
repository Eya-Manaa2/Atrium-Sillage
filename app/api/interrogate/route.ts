import { createAgentUIStreamResponse, stepCountIs, tool, ToolLoopAgent, type UIMessage } from 'ai'
import { z } from 'zod'
import { caseSchema, MODEL, ROOM_IDS, ROOMS, roomSchema } from '@/lib/game/schema'

export const maxDuration = 60

const bodySchema = z.object({
  messages: z.array(z.unknown()),
  gameCase: caseSchema,
  suspectId: z.string(),
  discoveredClueIds: z.array(z.string()),
  stress: z.number(),
  room: roomSchema,
})

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Requête invalide' }, { status: 400 })

  const { messages, gameCase, suspectId, discoveredClueIds, stress, room } = parsed.data
  const suspect = gameCase.suspects.find((s) => s.id === suspectId)
  if (!suspect) return Response.json({ error: 'Suspect inconnu' }, { status: 404 })

  const isCulprit = gameCase.solution.culpritId === suspect.id
  const heldClues = gameCase.clues.filter((c) => c.holderId === suspect.id && !discoveredClueIds.includes(c.id))
  const knownByDetective = gameCase.clues.filter((c) => discoveredClueIds.includes(c.id))
  const others = gameCase.suspects
    .filter((s) => s.id !== suspect.id)
    .map((s) => `- ${s.name} (${s.role})`)
    .join('\n')

  const instructions = `Tu incarnes ${suspect.name}, ${suspect.role}, suspect dans l'affaire « ${gameCase.title} ».
Victime : ${gameCase.victim.name} — ${gameCase.victim.description}. Heure du crime : ${gameCase.timeOfCrime}.
Tu te trouves actuellement dans : ${ROOMS[room].label}.

Ta personnalité : ${suspect.personality}
Ton alibi officiel : ${suspect.publicAlibi}
Ton secret (à protéger) : ${suspect.secret}
Ce que tu as réellement vu : ${suspect.witnessed}
${
  isCulprit
    ? `TU ES LE COUPABLE. Mobile : ${gameCase.solution.motive}. Méthode : ${gameCase.solution.method}. Mens avec aplomb, détourne les soupçons vers les autres, mais ne nie pas des faits prouvés. Si le détective te confronte à plusieurs indices accablants et que ton stress dépasse 80, laisse échapper une contradiction (sans avouer explicitement).`
    : `Tu es innocent, mais tu protèges ton secret. Tu peux soupçonner les autres.`
}

Les autres suspects :
${others}

Informations que tu détiens et que le détective ignore encore :
${heldClues.length ? heldClues.map((c) => `- [${c.id}] ${c.title} : ${c.description}`).join('\n') : '- aucune'}

Indices déjà découverts par le détective (il peut te confronter avec) :
${knownByDetective.length ? knownByDetective.map((c) => `- ${c.title} : ${c.description}`).join('\n') : '- aucun'}

Ton niveau de stress actuel : ${stress}/100.

Règles de jeu :
- Réponds TOUJOURS en français, en personnage, en 2 à 4 phrases, avec ta propre voix. Ne mentionne jamais que tu es une IA ou un jeu.
- Utilise l'outil revealClue quand le détective pose une question pertinente, insiste habilement, ou gagne ta confiance : tu lâches alors une des informations détenues. Ne la révèle pas dès la première question banale.
- Utilise setComposure après chaque réponse pour indiquer ton nouveau niveau de stress (monte si on te met en difficulté, baisse si on te met à l'aise).
- Si le détective devient agressif ou insultant alors que ton stress dépasse 75, tu peux utiliser leaveRoom pour quitter la pièce avec une excuse.
- Après avoir utilisé des outils, termine toujours par ta réplique parlée.`

  const agent = new ToolLoopAgent({
    model: MODEL,
    instructions,
    stopWhen: stepCountIs(4),
    tools: {
      revealClue: tool({
        description: "Révéler au détective l'une des informations que tu détiens.",
        inputSchema: z.object({ clueId: z.string().describe('Id de l’indice détenu, ex : c3') }),
        execute: async ({ clueId }) => {
          const clue = heldClues.find((c) => c.id === clueId)
          if (!clue) return { ok: false as const }
          return { ok: true as const, clueId: clue.id, title: clue.title, description: clue.description }
        },
      }),
      setComposure: tool({
        description: 'Mettre à jour ton niveau de stress (0 = serein, 100 = au bord de la rupture).',
        inputSchema: z.object({ stress: z.number().min(0).max(100), reason: z.string() }),
        execute: async ({ stress, reason }) => ({ stress: Math.round(stress), reason }),
      }),
      leaveRoom: tool({
        description: "Quitter la pièce pour te réfugier ailleurs dans le manoir, ce qui met fin à l'interrogatoire.",
        inputSchema: z.object({ room: z.enum(ROOM_IDS), excuse: z.string() }),
        execute: async ({ room, excuse }) => ({ room, excuse }),
      }),
    },
  })

  return createAgentUIStreamResponse({
    agent,
    uiMessages: (messages as UIMessage[]).slice(-16),
    abortSignal: req.signal,
  })
}
