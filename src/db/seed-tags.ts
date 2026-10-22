
import { randomUUID } from 'node:crypto'
import { db } from './index.js'
import { tags } from './schema/tags.js'

const initialTags = [
  // Sciences et connaissances
  { name: 'Sciences', slug: 'sciences' },
  { name: 'Mathématiques', slug: 'mathematiques' },
  { name: 'Physique', slug: 'physique' },
  { name: 'Biologie', slug: 'biologie' },
  { name: 'Chimie', slug: 'chimie' },
  { name: 'Philosophie', slug: 'philosophie' },
  { name: 'Psychologie', slug: 'psychologie' },
  { name: 'Éducation', slug: 'education' },
  { name: 'Recherche', slug: 'recherche' },
  { name: 'Apprentissage', slug: 'apprentissage' },

  // Technologie et numérique
  { name: 'Programmation', slug: 'programmation' },
  { name: 'JavaScript', slug: 'javascript' },
  { name: 'TypeScript', slug: 'typescript' },
  { name: 'Python', slug: 'python' },
  { name: 'Intelligence artificielle', slug: 'intelligence-artificielle' },
  { name: 'Cybersécurité', slug: 'cybersecurite' },
  { name: 'Développement web', slug: 'developpement-web' },
  { name: 'Data', slug: 'data' },
  { name: 'Open source', slug: 'open-source' },
  { name: 'Innovation', slug: 'innovation' },

  // Société et culture
  { name: 'Société', slug: 'societe' },
  { name: 'Histoire', slug: 'histoire' },
  { name: 'Culture', slug: 'culture' },
  { name: 'Géopolitique', slug: 'geopolitique' },
  { name: 'Politique', slug: 'politique' },
  { name: 'Droit', slug: 'droit' },
  { name: 'Éthique', slug: 'ethique' },
  { name: 'Religion', slug: 'religion' },
  { name: 'Littérature', slug: 'litterature' },
  { name: 'Langues', slug: 'langues' },

  // Économie et vie professionnelle
  { name: 'Économie', slug: 'economie' },
  { name: 'Entrepreneuriat', slug: 'entrepreneuriat' },
  { name: 'Finance', slug: 'finance' },
  { name: 'Carrière', slug: 'carriere' },
  { name: 'Management', slug: 'management' },
  { name: 'Marketing', slug: 'marketing' },
  { name: 'Productivité', slug: 'productivite' },
  { name: 'Leadership', slug: 'leadership' },
  { name: 'Emploi', slug: 'emploi' },
  { name: 'Business', slug: 'business' },

  // Arts et divertissement
  { name: 'Art', slug: 'art' },
  { name: 'Design', slug: 'design' },
  { name: 'Cinéma', slug: 'cinema' },
  { name: 'Musique', slug: 'musique' },
  { name: 'Photographie', slug: 'photographie' },
  { name: 'Écriture', slug: 'ecriture' },
  { name: 'Jeux vidéo', slug: 'jeux-video' },
  { name: 'Anime et manga', slug: 'anime-manga' },

  // Environnement et vie quotidienne
  { name: 'Environnement', slug: 'environnement' },
  { name: 'Climat', slug: 'climat' },
  { name: 'Santé', slug: 'sante' },
  { name: 'Nutrition', slug: 'nutrition' },
  { name: 'Sport', slug: 'sport' },
  { name: 'Voyage', slug: 'voyage' },
  { name: 'Cuisine', slug: 'cuisine' },
  { name: 'Relations humaines', slug: 'relations-humaines' },
  { name: 'Vie quotidienne', slug: 'vie-quotidienne' },
  { name: 'Développement personnel', slug: 'developpement-personnel' },

  // Réflexion et débats
  { name: 'Débat', slug: 'debat' },
  { name: 'Opinion', slug: 'opinion' },
  { name: 'Sociologie', slug: 'sociologie' },
  { name: 'Avenir', slug: 'avenir' },
]

async function seedTags() {
  for (const tag of initialTags) {
    await db
      .insert(tags)
      .values({
        id: randomUUID(),
        name: tag.name,
        slug: tag.slug,
      })
      .onDuplicateKeyUpdate({
        set: { name: tag.name },
      })
  }

  console.info(`${initialTags.length} tags traités avec succès.`)
}

seedTags().catch((error: unknown) => {
  console.error('Échec du seed des tags :', error)
  process.exitCode = 1
})
