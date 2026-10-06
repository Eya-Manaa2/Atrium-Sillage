import { generateText, Output } from 'ai'
import { FALLBACK_CASE } from '@/lib/game/fallback-case'
import { caseSchema, MODEL, normalizeCase, ROOMS } from '@/lib/game/schema'

export const maxDuration = 60

const roomList = Object.entries(ROOMS)
  .map(([id, r]) => `${id} (${r.label})`)
  .join(', ')

export async function POST() {
  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: caseSchema }),
      prompt: `Tu es l'auteur d'un jeu d'enquête policière. Invente une affaire de meurtre ORIGINALE et cohérente se déroulant une nuit d'orage à l'Atrium Sillage, hôtel Art déco des années 1930 où les parfums, les rumeurs et les dettes se croisent dans le grand hall.

Contraintes :
- Pièces disponibles (utilise ces identifiants exacts) : ${roomList}.
- 4 suspects aux ids s1, s2, s3, s4, chacun avec une personnalité marquée et un secret. Un seul est coupable.
- 6 indices aux ids c1 à c6 : 3 cachés physiquement dans des pièces (room renseigné, holderId null) et 3 détenus par des suspects sous forme de témoignage ou d'objet (holderId renseigné, room null). Les suspects ne détiennent pas d'indice qui les accuse eux-mêmes.
- Au moins 3 indices doivent mener au coupable, les autres créent des fausses pistes crédibles.
- L'affaire doit être résoluble par déduction.
- Tout le texte est en français, ton élégant et noir.`,
    })
    return Response.json(normalizeCase(output))
  } catch (error) {
    console.error('[case] generation failed, using Atrium Sillage fallback', error)
    return Response.json(normalizeCase(FALLBACK_CASE))
  }
}
