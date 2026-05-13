export interface Resource {
  id: number
  title: string
  url: string
  description: string | null
  category: string | null
  tags: string | null
  submitter_name: string | null
  created_at: string
}

export interface ResourceCreate {
  title: string
  url: string
  description?: string
  category?: string
  tags?: string
  submitter_name?: string
}

export const CATEGORIES = [
  'Tools',
  'Articles',
  'Videos',
  'Courses',
  'Research Papers',
  'Tutorials',
  'Datasets',
  'Models',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]
