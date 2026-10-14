import locations from '../constants/chile-locations.json';

export type PublicationFilters = { type: 'ALL' | 'SERVICIO' | 'OPORTUNIDAD'; featured: boolean; category: string; regionId: string; commune: string };
export const defaultPublicationFilters: PublicationFilters = { type: 'ALL', featured: true, category: '', regionId: '', commune: '' };
export const chileRegions = locations.regions;
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
type SearchPublication = { id: string; kind?: 'SERVICIO' | 'OPORTUNIDAD'; category: string; commune: string; budget: number; createdAt: string };

// Mantiene la afinidad actual de Inicio; no representa una verificación del perfil.
export function publicationAffinity(job: SearchPublication) {
  let score = 70;
  if (job.commune.toLowerCase().includes('maipu')) score += 12;
  if (job.budget >= 25000) score += 7;
  if (job.category.toLowerCase().includes('tecnolog')) score += 5;
  return Math.min(score, 96);
}

export function filterPublications<T extends SearchPublication>(jobs: T[], filters: PublicationFilters, excluded: string[] = []): T[] {
  const region = chileRegions.find(item => item.id === filters.regionId);
  const communes = region ? new Set(region.communes.map(item => normalizeSearch(item.name))) : null;
  const result = jobs.filter(job => !excluded.includes(job.id)
    && (filters.type === 'ALL' || (job.kind ?? 'OPORTUNIDAD') === filters.type)
    && (!filters.category.trim() || normalizeSearch(job.category).includes(normalizeSearch(filters.category)))
    && (!communes || communes.has(normalizeSearch(job.commune)))
    && (!filters.commune || normalizeSearch(job.commune) === normalizeSearch(filters.commune)));
  return result.sort((a, b) => (filters.featured ? publicationAffinity(b) - publicationAffinity(a) : 0)
    || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function readPublicationFilters(value?: string | string[]): PublicationFilters {
  try {
    const parsed = JSON.parse(Array.isArray(value) ? value[0] : value ?? '{}');
    return { type: ['ALL', 'SERVICIO', 'OPORTUNIDAD'].includes(parsed.type) ? parsed.type : 'ALL', featured: typeof parsed.featured === 'boolean' ? parsed.featured : true,
      category: typeof parsed.category === 'string' ? parsed.category.slice(0, 150) : '', regionId: chileRegions.some(item => item.id === parsed.regionId) ? parsed.regionId : '',
      commune: typeof parsed.commune === 'string' ? parsed.commune.slice(0, 100) : '' };
  } catch { return { ...defaultPublicationFilters }; }
}
