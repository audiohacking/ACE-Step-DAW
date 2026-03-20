import { useEffect, useState } from 'react';
import { healthCheck, listModels } from '../../services/aceStepApi';

const MODEL_STATUS_POLL_INTERVAL_MS = 10_000;

type ToolbarModelBadgeStatus = 'loaded' | 'loading' | 'none';

function resolveModelBadgeStatus(selectedModel: string, connected: boolean, loadedModelNames: Set<string>): ToolbarModelBadgeStatus {
  if (!selectedModel) return 'none';
  return connected && loadedModelNames.has(selectedModel) ? 'loaded' : 'loading';
}

export function ModelStatusBadge({ modelName, onClick }: { modelName: string; onClick: () => void }) {
  const [connected, setConnected] = useState(false);
  const [loadedModelNames, setLoadedModelNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    let interval: number | null = null;

    const refreshStatus = async () => {
      const ok = await healthCheck();
      if (!active) return;
      setConnected(ok);

      if (!ok) {
        setLoadedModelNames(new Set());
        return;
      }

      try {
        const resp = await listModels();
        if (!active) return;
        const loaded = new Set((resp.models ?? []).filter((model) => model.is_loaded).map((model) => model.name));
        setLoadedModelNames(loaded);
      } catch {
        if (!active) return;
        setLoadedModelNames(new Set());
      }
    };

    void refreshStatus();
    interval = window.setInterval(() => {
      void refreshStatus();
    }, MODEL_STATUS_POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (interval !== null) {
        window.clearInterval(interval);
      }
    };
  }, [modelName]);

  const displayName = modelName || 'No model';
  const status = resolveModelBadgeStatus(modelName, connected, loadedModelNames);
  const dotClassName =
    status === 'loaded'
      ? 'bg-emerald-500'
      : status === 'loading'
        ? 'bg-amber-400'
        : 'bg-zinc-500';
  const statusLabel =
    status === 'loaded'
      ? `${displayName} loaded`
      : status === 'loading'
        ? `${displayName} loading`
        : 'No model loaded';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md border border-[#4b4b4b] bg-[#242424] px-2.5 py-1 text-[11px] text-zinc-300 transition-colors hover:bg-daw-surface-2 hover:text-white"
      title="Model Library (Y)"
      aria-label={`Model status: ${displayName}`}
    >
      <span data-testid="toolbar-model-status-dot" className={`h-2 w-2 rounded-full ${dotClassName}`} aria-hidden="true" />
      <span className="max-w-[11rem] truncate">{displayName}</span>
      <span className="sr-only">{statusLabel}</span>
    </button>
  );
}
