import type { GameCase } from '@/lib/game/schema'

/** Affair jouable sans appel modèle (Atrium Sillage). */
export const FALLBACK_CASE: GameCase = {
  title: 'Le sillage de minuit',
  intro:
    'Vous êtes le détective de service à l’Atrium Sillage, hôtel Art déco où les rumeurs collent aux tapis. Vers minuit, le concierge a trouvé le collectionneur Albin Veyrier sans vie dans le grand hall. Quatre hôtes n’ont pas quitté l’immeuble. Interrogez, fouillez, accusez — avant que le sillage ne se dissipe.',
  victim: {
    name: 'Albin Veyrier',
    description: 'Collectionneur de parfums rares, hôte capricieux de la suite Impériale, connu pour ses dettes mondaines et ses menaces de révélations.',
  },
  timeOfCrime: '23 h 40, orage',
  crimeRoom: 'hall',
  suspects: [
    {
      id: 's1',
      name: 'Hélène Marchal',
      role: 'Directrice de l’hôtel, ancienne associée d’Albin',
      personality: 'Voix posée, phrases courtes, jamais un mot de trop ; sourit pour clore un sujet.',
      publicAlibi: 'Elle réglait le registre des chambres au bureau, seule, après le dîner.',
      secret: 'Elle a détourné une partie des recettes de l’hôtel pour racheter discrètement une dette d’Albin.',
      witnessed: 'Vers 23 h 20, elle a vu Léandre quitter le hall en direction des cuisines, un gant à la main.',
      startRoom: 'study',
    },
    {
      id: 's2',
      name: 'Léandre Veyrier',
      role: 'Neveu endetté du collectionneur',
      personality: 'Nerveux, parle trop vite, plaisante mal à propos, évite le regard.',
      publicAlibi: 'Il fumait sous le auvent du jardin d’hiver, à l’abri de la pluie.',
      secret: 'Il a volé un flacon de « Sillage Noir » dans la suite d’Albin pour le revendre.',
      witnessed: 'Il a entendu une altercation étouffée dans le hall, puis un verre qui se brise, avant de filer aux cuisines.',
      startRoom: 'conservatory',
    },
    {
      id: 's3',
      name: 'Iris Delambre',
      role: 'Parfumeuse invitée, concurrente d’Albin',
      personality: 'Élégante, ironique, décrit tout comme une note olfactive ; ne se démonte pas.',
      publicAlibi: 'Elle mélangeait des échantillons au salon, porte ouverte, visible du personnel.',
      secret: 'Sa formule phare est un plagiat d’un carnet volé à Albin il y a deux ans.',
      witnessed: 'Elle a senti une odeur d’amandes amères dans le hall vers 23 h 35, puis vu Hélène refermer le buffet.',
      startRoom: 'salon',
    },
    {
      id: 's4',
      name: 'Otto Kranz',
      role: 'Majordome de nuit, ancien chimiste',
      personality: 'Formel, presque militaire, corrige les détails, s’excuse trop souvent.',
      publicAlibi: 'Il préparait les plateaux du service de nuit dans les cuisines.',
      secret: 'Il a été renvoyé d’un laboratoire pour un « accident » au cyanure, il y a dix ans.',
      witnessed: 'Il a trouvé le gant de Léandre près de l’évier, encore humide, et l’a caché dans un torchon.',
      startRoom: 'kitchen',
    },
  ],
  clues: [
    {
      id: 'c1',
      title: 'Flacon brisé',
      description: 'Un flacon de Sillage Noir gît près du corps ; le bouchon sent l’amande amère, pas le parfum original.',
      room: 'hall',
      holderId: null,
      pointsTo: 's3',
    },
    {
      id: 'c2',
      title: 'Registre falsifié',
      description: 'Au bureau, une rature à 23 h 25 : Hélène a écrit « ronde des étages » par-dessus « hall — Albin ».',
      room: 'study',
      holderId: null,
      pointsTo: 's1',
    },
    {
      id: 'c3',
      title: 'Gant mouillé',
      description: 'Un gant d’homme, taille de Léandre, encore humide de pluie, était caché dans un torchon des cuisines.',
      room: 'kitchen',
      holderId: null,
      pointsTo: 's2',
    },
    {
      id: 'c4',
      title: 'Carnet de formules',
      description: 'Iris admet, si on insiste, qu’Albin menaçait de publier la preuve de son plagiat le lendemain.',
      room: null,
      holderId: 's3',
      pointsTo: 's3',
    },
    {
      id: 'c5',
      title: 'Clé du buffet',
      description: 'Hélène peut avouer qu’elle est passée au hall pour « vérifier le buffet » : elle a vu le corps, puis a refermé sans crier.',
      room: null,
      holderId: 's1',
      pointsTo: 's1',
    },
    {
      id: 'c6',
      title: 'Sel de laboratoire',
      description: 'Otto, sous pression, décrit un sachet de cyanure « pour l’argenterie » disparu de son casier à 23 h.',
      room: null,
      holderId: 's4',
      pointsTo: 's4',
    },
  ],
  solution: {
    culpritId: 's3',
    motive:
      'Albin allait publier la preuve qu’Iris avait volé sa formule ; elle a versé du cyanure dans le flacon de Sillage Noir offert comme « réconciliation ».',
    method:
      'Iris a rejoint le hall sous prétexte d’un échantillon, a fait boire Albin, a brisé le flacon pour simuler une chute, puis est retournée au salon.',
  },
}
