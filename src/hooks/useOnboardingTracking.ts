import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { markMilestone } from './useOnboardingProgress';

/**
 * Passively monitors store state changes and marks onboarding milestones.
 * Should be mounted once in the app shell.
 */
export function useOnboardingTracking() {
  const project = useProjectStore((s) => s.project);
  const showMixer = useUIStore((s) => s.showMixer);
  const openPianoRollTrackId = useUIStore((s) => s.openPianoRollTrackId);
  const mainView = useUIStore((s) => s.mainView);
  const showCommandPalette = useUIStore((s) => s.showCommandPalette);

  useEffect(() => {
    if (project) markMilestone('created_project');
  }, [project]);

  useEffect(() => {
    if (project && project.tracks.length > 0) markMilestone('added_track');
  }, [project, project?.tracks.length]);

  useEffect(() => {
    if (showMixer) markMilestone('used_mixer');
  }, [showMixer]);

  useEffect(() => {
    if (openPianoRollTrackId) markMilestone('used_piano_roll');
  }, [openPianoRollTrackId]);

  useEffect(() => {
    if (mainView === 'session') markMilestone('used_session_view');
  }, [mainView]);

  useEffect(() => {
    if (showCommandPalette) markMilestone('used_command_palette');
  }, [showCommandPalette]);
}
