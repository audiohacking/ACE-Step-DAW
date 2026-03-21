import type { Project } from '../types/project';

export interface CloudProject {
  cloudId: string;
  projectId: string;
  owner: string;
  version: number;
  savedAt: number;
  project: Project;
}

export interface CloudProjectSummary {
  cloudId: string;
  projectId: string;
  name: string;
  owner: string;
  version: number;
  savedAt: number;
  trackCount: number;
}

export interface CloudVersionEntry {
  version: number;
  savedAt: number;
  cloudId: string;
}

export interface SharedStemAsset {
  trackId: string;
  trackName: string;
  color: string;
  volume: number;
  lyrics: string;
  audioDataUrl: string;
}

export interface SharedProjectRecord {
  token: string;
  projectId: string;
  owner: string;
  sharedAt: number;
  project: Project;
  stems: SharedStemAsset[];
}

export interface SharedProjectSummary {
  token: string;
  projectId: string;
  name: string;
  owner: string;
  sharedAt: number;
  stemCount: number;
}

interface SharedProjectInput {
  project: Project;
  owner: string;
  stems: SharedStemAsset[];
}

let _store = new Map<string, CloudProject>();
let _versionHistory = new Map<string, CloudVersionEntry[]>();
let _sharedStore = new Map<string, SharedProjectRecord>();

const SHARED_PROJECT_STORAGE_KEY = 'ace-step.shared-projects.v1';

function generateCloudId(projectId: string, version: number): string {
  return `cloud_${projectId}_v${version}_${Date.now().toString(36)}`;
}

function generateShareToken(projectId: string): string {
  return `share_${projectId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readSharedProjectsFromStorage(): SharedProjectRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  const raw = window.localStorage.getItem(SHARED_PROJECT_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SharedProjectRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function syncSharedProjectsToStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(
    SHARED_PROJECT_STORAGE_KEY,
    JSON.stringify(Array.from(_sharedStore.values())),
  );
}

function ensureSharedStoreLoaded(): void {
  if (_sharedStore.size > 0) {
    return;
  }

  for (const record of readSharedProjectsFromStorage()) {
    _sharedStore.set(record.token, record);
  }
}

export const cloudStorage = {
  async save(project: Project, owner: string): Promise<CloudProject> {
    const existing = _store.get(project.id);
    const version = existing ? existing.version + 1 : 1;
    const now = Date.now();
    const cloudId = generateCloudId(project.id, version);
    const record: CloudProject = {
      cloudId, projectId: project.id, owner, version, savedAt: now,
      project: structuredClone(project),
    };
    _store.set(project.id, record);
    const history = _versionHistory.get(project.id) ?? [];
    history.push({ version, savedAt: now, cloudId });
    _versionHistory.set(project.id, history);
    return record;
  },
  async load(projectId: string): Promise<CloudProject | null> {
    return _store.get(projectId) ?? null;
  },
  async list(): Promise<CloudProjectSummary[]> {
    const summaries: CloudProjectSummary[] = [];
    for (const record of _store.values()) {
      summaries.push({
        cloudId: record.cloudId, projectId: record.projectId, name: record.project.name,
        owner: record.owner, version: record.version, savedAt: record.savedAt,
        trackCount: record.project.tracks.length,
      });
    }
    return summaries.sort((a, b) => {
      const aTime = _store.get(a.projectId)?.project.updatedAt ?? a.savedAt;
      const bTime = _store.get(b.projectId)?.project.updatedAt ?? b.savedAt;
      return bTime - aTime;
    });
  },
  async delete(projectId: string): Promise<boolean> {
    const existed = _store.has(projectId);
    _store.delete(projectId);
    _versionHistory.delete(projectId);
    return existed;
  },
  async getVersionHistory(projectId: string): Promise<CloudVersionEntry[]> {
    return _versionHistory.get(projectId) ?? [];
  },
  async saveSharedProject(input: SharedProjectInput): Promise<SharedProjectRecord> {
    ensureSharedStoreLoaded();

    const record: SharedProjectRecord = {
      token: generateShareToken(input.project.id),
      projectId: input.project.id,
      owner: input.owner,
      sharedAt: Date.now(),
      project: structuredClone(input.project),
      stems: structuredClone(input.stems),
    };

    _sharedStore.set(record.token, record);
    syncSharedProjectsToStorage();
    return record;
  },
  async loadSharedProject(token: string): Promise<SharedProjectRecord | null> {
    ensureSharedStoreLoaded();
    return _sharedStore.get(token) ?? null;
  },
  async listSharedProjects(): Promise<SharedProjectSummary[]> {
    ensureSharedStoreLoaded();
    return Array.from(_sharedStore.values())
      .map((record) => ({
        token: record.token,
        projectId: record.projectId,
        name: record.project.name,
        owner: record.owner,
        sharedAt: record.sharedAt,
        stemCount: record.stems.length,
      }))
      .sort((a, b) => b.sharedAt - a.sharedAt);
  },
};

export function resetCloudStorage(): void {
  _store = new Map();
  _versionHistory = new Map();
  _sharedStore = new Map();

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(SHARED_PROJECT_STORAGE_KEY);
  }
}
