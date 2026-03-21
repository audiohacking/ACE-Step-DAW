import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cloudStorage, resetCloudStorage } from '../../src/services/cloudStorageService';
import type { Project } from '../../src/types/project';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: overrides.id ?? 'proj-1',
    name: overrides.name ?? 'Test Project',
    createdAt: overrides.createdAt ?? 1000,
    updatedAt: overrides.updatedAt ?? 2000,
    bpm: 120,
    keyScale: 'C major',
    timeSignature: 4,
    totalDuration: 60,
    tracks: overrides.tracks ?? [],
    generationDefaults: {
      inferenceSteps: 100,
      guidanceScale: 15,
      shift: 5,
      thinking: false,
      model: 'ace-step-v1',
    },
    ...overrides,
  };
}

describe('cloudStorageService', () => {
  beforeEach(() => {
    resetCloudStorage();
  });

  describe('save', () => {
    it('saves a project and returns a CloudProject with version 1', async () => {
      const project = makeProject();
      const record = await cloudStorage.save(project, 'alice');

      expect(record.projectId).toBe('proj-1');
      expect(record.owner).toBe('alice');
      expect(record.version).toBe(1);
      expect(record.cloudId).toMatch(/^cloud_proj-1_v1_/);
      expect(record.project.name).toBe('Test Project');
    });

    it('increments version on subsequent saves', async () => {
      const project = makeProject();
      const r1 = await cloudStorage.save(project, 'alice');
      expect(r1.version).toBe(1);

      project.name = 'Updated';
      const r2 = await cloudStorage.save(project, 'alice');
      expect(r2.version).toBe(2);

      const r3 = await cloudStorage.save(project, 'alice');
      expect(r3.version).toBe(3);
    });

    it('deep-clones the project (mutation does not affect stored copy)', async () => {
      const project = makeProject({ tracks: [{ id: 't1' } as any] });
      const record = await cloudStorage.save(project, 'alice');

      project.tracks.push({ id: 't2' } as any);
      expect(record.project.tracks).toHaveLength(1);

      const loaded = await cloudStorage.load('proj-1');
      expect(loaded!.project.tracks).toHaveLength(1);
    });
  });

  describe('load', () => {
    it('returns null for non-existent project', async () => {
      const result = await cloudStorage.load('nonexistent');
      expect(result).toBeNull();
    });

    it('returns the latest saved record', async () => {
      const project = makeProject();
      await cloudStorage.save(project, 'alice');
      project.name = 'V2';
      await cloudStorage.save(project, 'alice');

      const loaded = await cloudStorage.load('proj-1');
      expect(loaded!.version).toBe(2);
      expect(loaded!.project.name).toBe('V2');
    });
  });

  describe('list', () => {
    it('returns empty array when no projects saved', async () => {
      const list = await cloudStorage.list();
      expect(list).toEqual([]);
    });

    it('returns summaries for all saved projects', async () => {
      await cloudStorage.save(makeProject({ id: 'p1', name: 'Alpha' }), 'alice');
      await cloudStorage.save(makeProject({ id: 'p2', name: 'Beta', tracks: [{ id: 't1' } as any] }), 'bob');

      const list = await cloudStorage.list();
      expect(list).toHaveLength(2);

      const p2Summary = list.find((s) => s.projectId === 'p2');
      expect(p2Summary!.name).toBe('Beta');
      expect(p2Summary!.owner).toBe('bob');
      expect(p2Summary!.trackCount).toBe(1);
    });

    it('sorts by updatedAt descending', async () => {
      await cloudStorage.save(makeProject({ id: 'p1', updatedAt: 1000 }), 'a');
      await cloudStorage.save(makeProject({ id: 'p2', updatedAt: 3000 }), 'b');
      await cloudStorage.save(makeProject({ id: 'p3', updatedAt: 2000 }), 'c');

      const list = await cloudStorage.list();
      expect(list.map((s) => s.projectId)).toEqual(['p2', 'p3', 'p1']);
    });
  });

  describe('delete', () => {
    it('returns false for non-existent project', async () => {
      const result = await cloudStorage.delete('nonexistent');
      expect(result).toBe(false);
    });

    it('removes the project and its version history', async () => {
      const project = makeProject();
      await cloudStorage.save(project, 'alice');
      await cloudStorage.save(project, 'alice');

      const deleted = await cloudStorage.delete('proj-1');
      expect(deleted).toBe(true);

      const loaded = await cloudStorage.load('proj-1');
      expect(loaded).toBeNull();

      const history = await cloudStorage.getVersionHistory('proj-1');
      expect(history).toEqual([]);
    });
  });

  describe('getVersionHistory', () => {
    it('returns empty array for unknown project', async () => {
      const history = await cloudStorage.getVersionHistory('unknown');
      expect(history).toEqual([]);
    });

    it('tracks all saved versions', async () => {
      const project = makeProject();
      await cloudStorage.save(project, 'alice');
      await cloudStorage.save(project, 'alice');
      await cloudStorage.save(project, 'alice');

      const history = await cloudStorage.getVersionHistory('proj-1');
      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(1);
      expect(history[1].version).toBe(2);
      expect(history[2].version).toBe(3);
      expect(history[0].cloudId).toMatch(/^cloud_proj-1_v1_/);
    });
  });

  describe('resetCloudStorage', () => {
    it('clears all data', async () => {
      await cloudStorage.save(makeProject({ id: 'p1' }), 'alice');
      await cloudStorage.save(makeProject({ id: 'p2' }), 'bob');

      resetCloudStorage();

      const list = await cloudStorage.list();
      expect(list).toEqual([]);
      expect(await cloudStorage.load('p1')).toBeNull();
    });
  });

  describe('shared projects', () => {
    it('persists a shared project payload and loads it by token', async () => {
      const shared = await cloudStorage.saveSharedProject({
        project: makeProject({ id: 'shared-proj', name: 'Shared Demo' }),
        owner: 'alice',
        stems: [
          {
            trackId: 'track-1',
            trackName: 'Drums',
            color: '#ff5500',
            volume: 0.82,
            lyrics: 'kick snare hat',
            audioDataUrl: 'data:audio/mpeg;base64,AAA=',
          },
        ],
      });

      expect(shared.token).toMatch(/^share_/);
      expect(shared.projectId).toBe('shared-proj');
      expect(shared.owner).toBe('alice');
      expect(shared.stems).toHaveLength(1);
      expect(shared.stems[0].trackName).toBe('Drums');

      const loaded = await cloudStorage.loadSharedProject(shared.token);
      expect(loaded).toEqual(shared);
    });

    it('lists shared projects in reverse sharedAt order', async () => {
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000);

      const older = await cloudStorage.saveSharedProject({
        project: makeProject({ id: 'old-proj', updatedAt: 1000 }),
        owner: 'alice',
        stems: [],
      });
      const newer = await cloudStorage.saveSharedProject({
        project: makeProject({ id: 'new-proj', updatedAt: 2000 }),
        owner: 'bob',
        stems: [],
      });

      const list = await cloudStorage.listSharedProjects();

      expect(list.map((entry) => entry.token)).toEqual([newer.token, older.token]);
      expect(list[0].name).toBe('Test Project');
      expect(list[0].stemCount).toBe(0);

      vi.restoreAllMocks();
    });
  });
});
