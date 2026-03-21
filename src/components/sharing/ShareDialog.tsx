import { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useCollaborationStore } from '../../store/collaborationStore';
import { createProjectShare } from '../../services/projectSharingService';
import {
  exportShareBundle,
  importShareBundle,
  downloadShareBundle,
  copyShareLinkToClipboard,
} from '../../services/collaborationService';
import { toastError, toastSuccess } from '../../hooks/useToast';

export function ShareDialog() {
  const show = useCollaborationStore((s) => s.showShareDialog);
  const setShow = useCollaborationStore((s) => s.setShowShareDialog);
  const setActiveShare = useCollaborationStore((s) => s.setActiveShare);
  const activeShareUrl = useCollaborationStore((s) => s.activeShareUrl);
  const cloudBusy = useCollaborationStore((s) => s.cloudBusy);
  const setCloudBusy = useCollaborationStore((s) => s.setCloudBusy);
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);

  const [tab, setTab] = useState<'share' | 'import'>('share');
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareProgressLabel, setShareProgressLabel] = useState('');

  if (!show) {
    return null;
  }

  async function handleCreateShare() {
    if (!project) {
      return;
    }

    setCloudBusy(true);
    setShareProgressLabel('Preparing stems...');

    try {
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const { shareUrl, record } = await createProjectShare(project, baseUrl, {
        onProgress: ({ completedTracks, totalTracks, currentTrackName }) => {
          const prefix = totalTracks > 0 ? `${Math.min(completedTracks + 1, totalTracks)}/${totalTracks}` : '0/0';
          setShareProgressLabel(`${prefix} ${currentTrackName}`);
        },
      });

      setActiveShare(record.token, shareUrl);
      toastSuccess('Share link created with embedded stem player');
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to create share link');
    } finally {
      setCloudBusy(false);
    }
  }

  async function handleCopyLink() {
    if (!activeShareUrl) {
      return;
    }

    const copiedToClipboard = await copyShareLinkToClipboard(activeShareUrl);
    if (!copiedToClipboard) {
      toastError('Failed to copy link');
      return;
    }

    setCopied(true);
    toastSuccess('Share link copied to clipboard');
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadBundle() {
    if (!project) {
      return;
    }

    downloadShareBundle(project);
    toastSuccess('Share bundle downloaded');
  }

  function handleCopyBundle() {
    if (!project) {
      return;
    }

    const json = exportShareBundle(project);
    navigator.clipboard.writeText(json).then(
      () => toastSuccess('Bundle JSON copied to clipboard'),
      () => toastError('Failed to copy bundle JSON'),
    );
  }

  function handleImportFromText() {
    try {
      const bundle = importShareBundle(importText);
      setProject(bundle.project);
      setImportText('');
      setShow(false);
      toastSuccess(`Imported "${bundle.project.name}" from share bundle`);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to import share bundle');
    }
  }

  function handleImportFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        const bundle = importShareBundle(text);
        setProject(bundle.project);
        setShow(false);
        toastSuccess(`Imported "${bundle.project.name}" from file`);
      } catch {
        toastError('Invalid share bundle file');
      }
    };
    input.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[480px] rounded-lg border border-daw-border bg-daw-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-daw-border px-4 py-3">
          <h2 className="text-sm font-medium">Share Project</h2>
          <button
            type="button"
            onClick={() => setShow(false)}
            aria-label="Close share dialog"
            className="text-lg leading-none text-zinc-400 hover:text-zinc-300"
          >
            ×
          </button>
        </div>

        <div className="flex border-b border-daw-border">
          <button
            type="button"
            onClick={() => setTab('share')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              tab === 'share'
                ? 'border-b-2 border-daw-accent text-daw-accent'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Share
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              tab === 'import'
                ? 'border-b-2 border-daw-accent text-daw-accent'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Import
          </button>
        </div>

        <div className="space-y-4 p-4">
          {tab === 'share' && project && (
            <>
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/8 p-3">
                <p className="text-sm font-medium text-zinc-100">Create a browser-ready review link</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  ACE-Step renders each track to an MP3 stem, stores the bundle in the local share endpoint, and generates a link that opens a standalone stem player with lyrics preview.
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-daw-border bg-daw-surface-2/60 p-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{project.tracks.length} track{project.tracks.length === 1 ? '' : 's'} in project</span>
                  {cloudBusy && <span className="text-cyan-300">{shareProgressLabel || 'Rendering stems...'}</span>}
                </div>

                <button
                  type="button"
                  onClick={() => void handleCreateShare()}
                  disabled={cloudBusy}
                  className="w-full rounded bg-daw-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-daw-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cloudBusy ? 'Rendering Stems...' : 'Render Stems & Create Link'}
                </button>

                {activeShareUrl && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={activeShareUrl}
                      aria-label="Active share link"
                      className="flex-1 truncate rounded border border-daw-border bg-daw-surface px-2 py-1.5 text-xs text-zinc-300"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCopyLink()}
                      className="rounded bg-daw-surface px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#484848]"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-daw-border pt-2">
                <p className="text-xs text-zinc-400">Project-data sharing for backup and import:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBundle}
                    className="flex-1 rounded bg-daw-surface-2 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-[#484848]"
                  >
                    Download .json
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyBundle}
                    className="flex-1 rounded bg-daw-surface-2 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-[#484848]"
                  >
                    Copy JSON
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'import' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">Import a project from a share bundle JSON file.</p>

              <button
                type="button"
                onClick={handleImportFromFile}
                className="w-full rounded bg-daw-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-daw-accent-hover"
              >
                Import from File
              </button>

              <div className="space-y-1">
                <p className="text-xs text-zinc-400">Or paste bundle JSON:</p>
                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder='{"format":"ace-step-share",...}'
                  className="h-24 w-full resize-none rounded border border-daw-border bg-daw-surface-2 px-2 py-1.5 font-mono text-xs text-zinc-300"
                />
                <button
                  type="button"
                  onClick={handleImportFromText}
                  disabled={!importText.trim()}
                  className="w-full rounded bg-daw-surface-2 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-[#484848] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Import from Text
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-daw-border px-4 py-3">
          <button
            type="button"
            onClick={() => setShow(false)}
            className="rounded bg-daw-surface-2 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-[#484848]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
