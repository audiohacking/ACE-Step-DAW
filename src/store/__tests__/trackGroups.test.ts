import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '../projectStore';

vi.mock('../../services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

describe('Track groups / folder tracks', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null });
    useProjectStore.getState().createProject();
  });

  it('createGroupTrack creates a group track with isGroup=true and collapsed=false', () => {
    const group = useProjectStore.getState().createGroupTrack('Drums Bus');
    expect(group.isGroup).toBe(true);
    expect(group.collapsed).toBe(false);
    expect(group.displayName).toBe('Drums Bus');

    const tracks = useProjectStore.getState().project!.tracks;
    expect(tracks).toHaveLength(1);
    expect(tracks[0].id).toBe(group.id);
  });

  it('moveTrackToGroup assigns parentTrackId and can remove it', () => {
    const group = useProjectStore.getState().createGroupTrack('Bus');
    useProjectStore.getState().addTrack('drums');
    const child = useProjectStore.getState().project!.tracks.find((t) => !t.isGroup)!;

    // Move into group
    useProjectStore.getState().moveTrackToGroup(child.id, group.id);
    const updated = useProjectStore.getState().project!.tracks.find((t) => t.id === child.id)!;
    expect(updated.parentTrackId).toBe(group.id);

    // Remove from group
    useProjectStore.getState().moveTrackToGroup(child.id, null);
    const removed = useProjectStore.getState().project!.tracks.find((t) => t.id === child.id)!;
    expect(removed.parentTrackId).toBeUndefined();
  });

  it('toggleGroupCollapse toggles the collapsed state', () => {
    const group = useProjectStore.getState().createGroupTrack('Bus');
    expect(useProjectStore.getState().project!.tracks[0].collapsed).toBe(false);

    useProjectStore.getState().toggleGroupCollapse(group.id);
    expect(useProjectStore.getState().project!.tracks[0].collapsed).toBe(true);

    useProjectStore.getState().toggleGroupCollapse(group.id);
    expect(useProjectStore.getState().project!.tracks[0].collapsed).toBe(false);
  });

  it('removeGroupTrack removes the group and unparents all children', () => {
    const group = useProjectStore.getState().createGroupTrack('Drums');
    useProjectStore.getState().addTrack('drums');
    useProjectStore.getState().addTrack('drums');
    const tracks = useProjectStore.getState().project!.tracks;
    const children = tracks.filter((t) => !t.isGroup);
    children.forEach((c) => useProjectStore.getState().moveTrackToGroup(c.id, group.id));

    // Verify children are in group
    expect(useProjectStore.getState().project!.tracks.filter((t) => t.parentTrackId === group.id)).toHaveLength(2);

    // Remove group
    useProjectStore.getState().removeGroupTrack(group.id);

    const remaining = useProjectStore.getState().project!.tracks;
    expect(remaining.find((t) => t.isGroup)).toBeUndefined();
    // Children should be unparented
    remaining.forEach((t) => {
      expect(t.parentTrackId).toBeUndefined();
    });
  });

  it('setGroupMuted mutes/unmutes all child tracks', () => {
    const group = useProjectStore.getState().createGroupTrack('Drums');
    useProjectStore.getState().addTrack('drums');
    useProjectStore.getState().addTrack('drums');
    const children = useProjectStore.getState().project!.tracks.filter((t) => !t.isGroup);
    children.forEach((c) => useProjectStore.getState().moveTrackToGroup(c.id, group.id));

    // Mute group
    useProjectStore.getState().setGroupMuted(group.id, true);
    const afterMute = useProjectStore.getState().project!.tracks;
    expect(afterMute.find((t) => t.id === group.id)!.muted).toBe(true);
    afterMute.filter((t) => t.parentTrackId === group.id).forEach((t) => {
      expect(t.muted).toBe(true);
    });

    // Unmute group
    useProjectStore.getState().setGroupMuted(group.id, false);
    const afterUnmute = useProjectStore.getState().project!.tracks;
    expect(afterUnmute.find((t) => t.id === group.id)!.muted).toBe(false);
    afterUnmute.filter((t) => t.parentTrackId === group.id).forEach((t) => {
      expect(t.muted).toBe(false);
    });
  });

  it('setGroupSoloed solos/unsolos all child tracks', () => {
    const group = useProjectStore.getState().createGroupTrack('Drums');
    useProjectStore.getState().addTrack('drums');
    useProjectStore.getState().addTrack('drums');
    const children = useProjectStore.getState().project!.tracks.filter((t) => !t.isGroup);
    children.forEach((c) => useProjectStore.getState().moveTrackToGroup(c.id, group.id));

    // Solo group
    useProjectStore.getState().setGroupSoloed(group.id, true);
    const afterSolo = useProjectStore.getState().project!.tracks;
    expect(afterSolo.find((t) => t.id === group.id)!.soloed).toBe(true);
    afterSolo.filter((t) => t.parentTrackId === group.id).forEach((t) => {
      expect(t.soloed).toBe(true);
    });

    // Unsolo group
    useProjectStore.getState().setGroupSoloed(group.id, false);
    const afterUnsolo = useProjectStore.getState().project!.tracks;
    expect(afterUnsolo.find((t) => t.id === group.id)!.soloed).toBe(false);
    afterUnsolo.filter((t) => t.parentTrackId === group.id).forEach((t) => {
      expect(t.soloed).toBe(false);
    });
  });

  it('getVisibleTracks hides children of collapsed groups', () => {
    const group = useProjectStore.getState().createGroupTrack('Drums');
    useProjectStore.getState().addTrack('drums');
    useProjectStore.getState().addTrack('vocals');
    const allTracks = useProjectStore.getState().project!.tracks;
    const drumChild = allTracks.find((t) => t.trackName === 'drums' && !t.isGroup)!;
    useProjectStore.getState().moveTrackToGroup(drumChild.id, group.id);

    // Not collapsed — all visible
    let visible = useProjectStore.getState().getVisibleTracks();
    expect(visible).toHaveLength(3); // group + drum child + vocals

    // Collapse group
    useProjectStore.getState().toggleGroupCollapse(group.id);
    visible = useProjectStore.getState().getVisibleTracks();
    expect(visible).toHaveLength(2); // group + vocals (drum child hidden)
    expect(visible.find((t) => t.id === drumChild.id)).toBeUndefined();
  });

  it('getGroupVolume returns average volume of child tracks', () => {
    const group = useProjectStore.getState().createGroupTrack('Bus');
    useProjectStore.getState().addTrack('drums');
    useProjectStore.getState().addTrack('drums');
    const children = useProjectStore.getState().project!.tracks.filter((t) => !t.isGroup);
    children.forEach((c) => useProjectStore.getState().moveTrackToGroup(c.id, group.id));

    // Set volumes
    useProjectStore.getState().updateTrack(children[0].id, { volume: 0.6 });
    useProjectStore.getState().updateTrack(children[1].id, { volume: 1.0 });

    const avgVol = useProjectStore.getState().getGroupVolume(group.id);
    expect(avgVol).toBe(0.8);
  });

  it('getGroupVolume returns 0 for group with no children', () => {
    const group = useProjectStore.getState().createGroupTrack('Empty');
    expect(useProjectStore.getState().getGroupVolume(group.id)).toBe(0);
  });

  it('group tracks get pan property', () => {
    const group = useProjectStore.getState().createGroupTrack('Drums');
    expect(group.pan).toBeUndefined(); // default

    useProjectStore.getState().updateTrack(group.id, { pan: 0.5 });
    const updated = useProjectStore.getState().project!.tracks.find((t) => t.id === group.id)!;
    expect(updated.pan).toBe(0.5);
  });

  it('group tracks can have insert effects', () => {
    const group = useProjectStore.getState().createGroupTrack('Drums');
    useProjectStore.getState().addTrackEffect(group.id, 'reverb');
    const updated = useProjectStore.getState().project!.tracks.find((t) => t.id === group.id)!;
    expect(updated.effects?.length).toBe(1);
    expect(updated.effects![0].type).toBe('reverb');
  });

  it('moving track to non-existent group does nothing', () => {
    useProjectStore.getState().addTrack('drums');
    const child = useProjectStore.getState().project!.tracks[0];
    useProjectStore.getState().moveTrackToGroup(child.id, 'non-existent');
    expect(useProjectStore.getState().project!.tracks[0].parentTrackId).toBeUndefined();
  });

  it('cannot move a group track into another group', () => {
    const group1 = useProjectStore.getState().createGroupTrack('Group 1');
    useProjectStore.getState().createGroupTrack('Group 2');
    useProjectStore.getState().moveTrackToGroup(group1.id, 'Group 2');
    // group tracks cannot be nested
    expect(useProjectStore.getState().project!.tracks.find((t) => t.id === group1.id)!.parentTrackId).toBeUndefined();
  });
});
