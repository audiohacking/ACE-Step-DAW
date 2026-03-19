import type { KeyCombo, ShortcutBindingExport } from '../types/shortcuts';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const CODE_LABELS: Record<string, string> = {
  Space: 'Space',
  Enter: 'Enter',
  Backspace: 'Backspace',
  Delete: 'Delete',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  Home: 'Home',
  End: 'End',
  Escape: 'Esc',
  Equal: '=',
  Minus: '-',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
};

const UNSAFE_BROWSER_COMBOS: Record<string, string> = {
  'mod+KeyW': 'Reserved by the browser to close the current tab.',
  'mod+KeyT': 'Reserved by the browser to open a new tab.',
  'mod+KeyL': 'Reserved by the browser to focus the address bar.',
  'mod+KeyR': 'Reserved by the browser to reload the page.',
  'mod+KeyP': 'Reserved by the browser to print the page.',
};

export function comboToId(combo: KeyCombo): string {
  const parts: string[] = [];
  if (combo.mod) parts.push('mod');
  if (combo.shift) parts.push('shift');
  if (combo.alt) parts.push('alt');
  parts.push(combo.code);
  return parts.join('+');
}

export function getUnsafeBrowserComboReason(combo: KeyCombo): string | null {
  return UNSAFE_BROWSER_COMBOS[comboToId(combo)] ?? null;
}

export function codeToLabel(code: string): string {
  if (CODE_LABELS[code]) return CODE_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3);
  return code;
}

export function comboToDisplay(combo: KeyCombo): string {
  const parts: string[] = [];
  if (combo.mod) parts.push(isMac ? 'Cmd' : 'Ctrl');
  if (combo.shift) parts.push('Shift');
  if (combo.alt) parts.push('Alt');
  parts.push(codeToLabel(combo.code));
  return parts.join(' + ');
}

export function keyEventToCombo(event: KeyboardEvent): KeyCombo | null {
  if (['Meta', 'Control', 'Shift', 'Alt'].includes(event.key)) return null;
  return {
    code: event.code,
    mod: event.metaKey || event.ctrlKey || undefined,
    shift: event.shiftKey || undefined,
    alt: event.altKey || undefined,
  };
}

export function serializeShortcutBindings(payload: ShortcutBindingExport): string {
  return JSON.stringify(payload, null, 2);
}

export function parseShortcutBindings(raw: string): ShortcutBindingExport {
  const parsed = JSON.parse(raw) as Partial<ShortcutBindingExport>;
  if (parsed.version !== 1) {
    throw new Error('Unsupported shortcut preset version.');
  }
  if (!parsed.presetId || typeof parsed.presetId !== 'string') {
    throw new Error('Shortcut preset is missing a valid preset id.');
  }
  if (!parsed.overrides || typeof parsed.overrides !== 'object') {
    throw new Error('Shortcut preset is missing overrides.');
  }
  return {
    version: 1,
    presetId: parsed.presetId,
    overrides: parsed.overrides,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
  };
}
