/**
 * Version History Service — persistent auto-save snapshots in IndexedDB.
 *
 * Each version stores a full Project snapshot with metadata for quick listing.
 * Keys: `version:{projectId}:{versionId}`
 *
 * @see https://github.com/ace-step/ACE-Step-DAW/issues/974
 */

import { get, set, del, keys } from 'idb-keyval';
import type { Project } from '../types/project';

const VERSION_PREFIX = 'version:';

export interface VersionSnapshot {
  id: string;
  projectId: string;
  savedAt: number;
  label: string;
  trackCount: number;
  bpm: number;
  project: Project;
}

function versionKey(projectId: string, versionId: string): string {
  return `${VERSION_PREFIX}${projectId}:${versionId}`;
}

function generateVersionId(): string {
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function saveVersion(
  project: Project,
  label = 'Auto-save',
): Promise<VersionSnapshot> {
  const id = generateVersionId();
  const snapshot: VersionSnapshot = {
    id,
    projectId: project.id,
    savedAt: Date.now(),
    label,
    trackCount: project.tracks.length,
    bpm: project.bpm,
    project: structuredClone(project),
  };

  await set(versionKey(project.id, id), snapshot);
  return snapshot;
}

export async function listVersions(projectId: string): Promise<VersionSnapshot[]> {
  const allKeys = await keys();
  const prefix = `${VERSION_PREFIX}${projectId}:`;
  const versionKeys = allKeys.filter(
    (k) => typeof k === 'string' && k.startsWith(prefix),
  ) as string[];

  const snapshots: VersionSnapshot[] = [];
  for (const key of versionKeys) {
    const data = await get<VersionSnapshot>(key);
    if (data) snapshots.push(data);
  }

  return snapshots.sort((a, b) => b.savedAt - a.savedAt);
}

export async function loadVersion(
  projectId: string,
  versionId: string,
): Promise<VersionSnapshot | null> {
  const data = await get<VersionSnapshot>(versionKey(projectId, versionId));
  return data ?? null;
}

export async function deleteVersion(
  projectId: string,
  versionId: string,
): Promise<void> {
  await del(versionKey(projectId, versionId));
}

export async function pruneVersions(
  projectId: string,
  keepCount: number,
): Promise<number> {
  const versions = await listVersions(projectId);
  if (versions.length <= keepCount) return 0;

  // versions is already sorted newest-first
  const toDelete = versions.slice(keepCount);
  for (const v of toDelete) {
    await del(versionKey(projectId, v.id));
  }
  return toDelete.length;
}
