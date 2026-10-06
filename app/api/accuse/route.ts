import { generateText } from 'ai'
import { z } from 'zod'
import { caseSchema, MODEL } from '@/lib/game/schema'

export const maxDuration = 60

const bodySchema = z.object({
  gameCase: caseSchema,
  suspectId: z.string(),
  reasoning: z.string().max(1200),
  discoveredClueIds: z.array(z.string()),
})

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Requête invalide' }, { status: 400 })

  const { gameCase, suspectId, reasoning, discoveredClueIds } = parsed.data
  const accused = gameCase.suspects.find((s) => s.id === suspectId)
  const culprit = gameCase.suspects.find((s) => s.id === gameCase.solution.culpritId)
  const correct = suspectId === gameCase.solution.culpritId

  let epilogue = ''
  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `Écris l'épilogue (5-7 phrases, français, style roman noir) de l'affaire « ${gameCase.title} ».
Le détective a accusé ${accused?.name} avec ce raisonnement : « ${reasoning || 'aucune explication'} ».
${correct ? 'Il a vu juste.' : `Il s'est trompé : le vrai coupable est ${culprit?.name}.`}
Vérité : mobile — ${gameCase.solution.motive} ; méthode — ${gameCase.solution.method}.
Indices trouvés : ${discoveredClueIds.length}/${gameCase.clues.length}.
Commente la justesse du raisonnement, puis raconte la scène finale dans le grand hall.`,
    })
    epilogue = text
  } catch (error) {
    console.error('[accuse] epilogue failed', error)
  }

  return Response.json({
    correct,
    accusedName: accused?.name ?? '',
    culpritName: culprit?.name ?? '',
    motive: gameCase.solution.motive,
    method: gameCase.solution.method,
    epilogue,
  })
}
