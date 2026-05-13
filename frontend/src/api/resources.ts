import type { Resource, ResourceCreate } from '../types/resource'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function fetchResources(): Promise<Resource[]> {
  const res = await fetch(`${API_URL}/resources`)
  if (!res.ok) throw new Error('Failed to fetch resources')
  return res.json()
}

export async function createResource(data: ResourceCreate): Promise<Resource> {
  const res = await fetch(`${API_URL}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Failed to create resource')
  }
  return res.json()
}

export async function deleteResource(id: number, adminPassword: string): Promise<void> {
  const res = await fetch(`${API_URL}/resources/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword },
  })
  if (!res.ok) throw new Error('Failed to delete resource')
}

export async function verifyAdmin(password: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/admin/verify`, {
    method: 'POST',
    headers: { 'x-admin-password': password },
  })
  return res.ok
}
