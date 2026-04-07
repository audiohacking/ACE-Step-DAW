import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockKeys = vi.fn();
vi.mock('idb-keyval', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  set: (...args: unknown[]) => mockSet(...args),
  del: (...args: unknown[]) => mockDel(...args),
  keys: (...args: unknown[]) => mockKeys(...args),
}));

import {
  saveVersion,
  listVersions,
  loadVersion,
  deleteVersion,
  pruneVersions,
  type VersionSnapshot,
} from '../versionHistory';
import type { Project } from '../../types/project';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Song',
    createdAt: 1000,
    updatedAt: 2000,
    bpm: 120,
    keyScale: 'C major',
    timeSignature: 4,
    totalDuration: 60,
    tracks: [],
    generationDefaults: {} as Project['generationDefaults'],
    ...overrides,
  };
}

describe('versionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockDel.mockResolvedValue(undefined);
  });

  describe('saveVersion', () => {
    it('stores a snapshot with auto-generated id and timestamp', async () => {
      const project = makeProject();
      const snapshot = await saveVersion(project, 'Auto-save');

      expect(snapshot.id).toBeTruthy();
      expect(snapshot.projectId).toBe('proj-1');
      expect(snapshot.label).toBe('Auto-save');
      expect(snapshot.savedAt).toBeGreaterThan(0);
      expect(snapshot.trackCount).toBe(0);
      expect(snapshot.bpm).toBe(120);
      expect(mockSet).toHaveBeenCalledWith(
        expect.stringContaining('version:proj-1:'),
        expect.objectContaining({ projectId: 'proj-1' }),
      );
    });

    it('stores the full project data in the snapshot', async () => {
      const project = makeProject({ name: 'My Song', bpm: 140 });
      const snapshot = await saveVersion(project, 'Named save');

      const storedArg = mockSet.mock.calls[0][1] as VersionSnapshot;
      expect(storedArg.project.name).toBe('My Song');
      expect(storedArg.project.bpm).toBe(140);
      expect(storedArg.label).toBe('Named save');
    });

    it('uses "Auto-save" as default label', async () => {
      const snapshot = await saveVersion(makeProject());
      expect(snapshot.label).toBe('Auto-save');
    });
  });

  describe('listVersions', () => {
    it('returns versions for a specific project sorted by newest first', async () => {
      mockKeys.mockResolvedValue([
        'version:proj-1:v1',
        'version:proj-1:v2',
        'version:proj-2:v1',
        'other-key',
      ]);
      mockGet
        .mockResolvedValueOnce({
          id: 'v1', projectId: 'proj-1', savedAt: 1000,
          label: 'First', trackCount: 2, bpm: 120, project: makeProject(),
        })
        .mockResolvedValueOnce({
          id: 'v2', projectId: 'proj-1', savedAt: 2000,
          label: 'Second', trackCount: 3, bpm: 130, project: makeProject(),
        });

      const versions = await listVersions('proj-1');

      expect(versions).toHaveLength(2);
      expect(versions[0].savedAt).toBe(2000);
      expect(versions[1].savedAt).toBe(1000);
    });

    it('returns empty array when no versions exist', async () => {
      mockKeys.mockResolvedValue([]);
      const versions = await listVersions('proj-1');
      expect(versions).toEqual([]);
    });
  });

  describe('loadVersion', () => {
    it('retrieves a full version snapshot', async () => {
      const project = makeProject();
      const stored: VersionSnapshot = {
        id: 'v1',
        projectId: 'proj-1',
        savedAt: 1000,
        label: 'Test',
        trackCount: 0,
        bpm: 120,
        project,
      };
      mockGet.mockResolvedValue(stored);

      const result = await loadVersion('proj-1', 'v1');

      expect(result).not.toBeNull();
      expect(result!.project.name).toBe('Test Song');
      expect(mockGet).toHaveBeenCalledWith('version:proj-1:v1');
    });

    it('returns null for non-existent version', async () => {
      mockGet.mockResolvedValue(undefined);
      const result = await loadVersion('proj-1', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('deleteVersion', () => {
    it('removes a version from storage', async () => {
      await deleteVersion('proj-1', 'v1');
      expect(mockDel).toHaveBeenCalledWith('version:proj-1:v1');
    });
  });

  describe('pruneVersions', () => {
    it('keeps only the most recent N versions', async () => {
      mockKeys.mockResolvedValue([
        'version:proj-1:v1',
        'version:proj-1:v2',
        'version:proj-1:v3',
        'version:proj-1:v4',
      ]);
      mockGet
        .mockResolvedValueOnce({ id: 'v1', projectId: 'proj-1', savedAt: 1000, label: 'A', trackCount: 0, bpm: 120, project: makeProject() })
        .mockResolvedValueOnce({ id: 'v2', projectId: 'proj-1', savedAt: 2000, label: 'B', trackCount: 0, bpm: 120, project: makeProject() })
        .mockResolvedValueOnce({ id: 'v3', projectId: 'proj-1', savedAt: 3000, label: 'C', trackCount: 0, bpm: 120, project: makeProject() })
        .mockResolvedValueOnce({ id: 'v4', projectId: 'proj-1', savedAt: 4000, label: 'D', trackCount: 0, bpm: 120, project: makeProject() });

      const deleted = await pruneVersions('proj-1', 2);

      expect(deleted).toBe(2);
      // Should delete the two oldest (v1, v2)
      expect(mockDel).toHaveBeenCalledWith('version:proj-1:v1');
      expect(mockDel).toHaveBeenCalledWith('version:proj-1:v2');
      expect(mockDel).not.toHaveBeenCalledWith('version:proj-1:v3');
      expect(mockDel).not.toHaveBeenCalledWith('version:proj-1:v4');
    });

    it('does nothing when under the limit', async () => {
      mockKeys.mockResolvedValue(['version:proj-1:v1']);
      mockGet.mockResolvedValueOnce({ id: 'v1', projectId: 'proj-1', savedAt: 1000, label: 'A', trackCount: 0, bpm: 120, project: makeProject() });

      const deleted = await pruneVersions('proj-1', 5);
      expect(deleted).toBe(0);
      expect(mockDel).not.toHaveBeenCalled();
    });
  });
});
