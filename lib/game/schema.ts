import { z } from 'zod'
import { google } from '@ai-sdk/google'

export const ROOM_IDS = ['study', 'library', 'conservatory', 'salon', 'hall', 'kitchen'] as const
export type RoomId = (typeof ROOM_IDS)[number]

export const ROOMS: Record<RoomId, { label: string; grid: [number, number] }> = {
  study: { label: 'Bureau', grid: [0, 0] },
  library: { label: 'Bibliothèque', grid: [1, 0] },
  conservatory: { label: "Jardin d'hiver", grid: [2, 0] },
  salon: { label: 'Salon', grid: [0, 1] },
  hall: { label: 'Grand hall', grid: [1, 1] },
  kitchen: { label: 'Cuisines', grid: [2, 1] },
}

export const roomSchema = z.enum(ROOM_IDS)

export const suspectSchema = z.object({
  id: z.string().describe('Identifiant court : s1, s2, s3 ou s4'),
  name: z.string().describe('Prénom et nom du personnage'),
  role: z.string().describe('Sa relation à la victime, ex : "neveu endetté"'),
  personality: z.string().describe('Traits de caractère et manière de parler, 1 phrase'),
  publicAlibi: z.string().describe("L'alibi qu'il donne spontanément"),
  secret: z.string().describe('Un secret personnel qu’il cache (même s’il est innocent)'),
  witnessed: z.string().describe('Ce que le personnage a réellement vu ou entendu ce soir-là'),
  startRoom: roomSchema,
})

export const clueSchema = z.object({
  id: z.string().describe('Identifiant court : c1 à c6'),
  title: z.string().describe('Nom court de l’indice'),
  description: z.string().describe('Description factuelle de l’indice, 1-2 phrases'),
  room: roomSchema.nullable().describe('Pièce où l’indice est caché, ou null s’il est détenu par un suspect'),
  holderId: z.string().nullable().describe('Id du suspect qui détient cette information, ou null'),
  pointsTo: z.string().describe('Id du suspect que cet indice incrimine ou disculpe'),
})

export const caseSchema = z.object({
  title: z.string().describe('Titre évocateur de l’affaire'),
  intro: z.string().describe('Mise en situation pour le détective, 2-3 phrases, à la 2e personne'),
  victim: z.object({ name: z.string(), description: z.string() }),
  timeOfCrime: z.string(),
  crimeRoom: roomSchema,
  suspects: z.array(suspectSchema).describe('Exactement 4 suspects'),
  clues: z.array(clueSchema).describe('Exactement 6 indices : 3 cachés dans des pièces, 3 détenus par des suspects'),
  solution: z.object({
    culpritId: z.string(),
    motive: z.string(),
    method: z.string(),
  }),
})

export type GameCase = z.infer<typeof caseSchema>
export type Suspect = z.infer<typeof suspectSchema>
export type Clue = z.infer<typeof clueSchema>

export function normalizeCase(raw: GameCase): GameCase {
  const suspects = raw.suspects.slice(0, 4)
  const idMap = new Map<string, string>()
  suspects.forEach((s, i) => idMap.set(s.id, `s${i + 1}`))
  const mapId = (id: string | null) => (id ? (idMap.get(id) ?? null) : null)

  const normalizedSuspects = suspects.map((s, i) => ({ ...s, id: `s${i + 1}` }))
  const clues = raw.clues.slice(0, 6).map((c, i) => {
    const holderId = mapId(c.holderId)
    return {
      ...c,
      id: `c${i + 1}`,
      holderId,
      room: holderId ? null : (c.room ?? raw.crimeRoom),
      pointsTo: mapId(c.pointsTo) ?? 's1',
    }
  })

  return {
    ...raw,
    suspects: normalizedSuspects,
    clues,
    solution: { ...raw.solution, culpritId: mapId(raw.solution.culpritId) ?? 's1' },
  }
}

export const MODEL = google('gemini-flash-lite-latest')
