import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import * as React from 'react';
import { useSyncExternalStore } from 'react';
import { useChatStore } from '../stores/chatStore';
import { notify } from '../ui/notifications';

export type Placement =
  | 'app.toolbar'
  | 'chat.inputBar'
  | 'chat.underUserMessage'
  | 'chat.underAIMessage'
  | 'chat.aboveLocalModelStatus'
  | 'settings.panel';

export type PluginUIElement = {
  id: string;
  placement: Placement;
  kind?: 'button' | 'group' | 'dropdown' | 'form' | 'custom';
  label?: string;
  tooltip?: string;
  icon?: any; // string url or React element
  onClick?: (ctx?: any) => void | Promise<void>;
  // for group / dropdown
  items?: Array<{ id: string; label?: string; tooltip?: string; icon?: any; onClick?: (ctx?: any) => void | Promise<void> }>;
  // for custom/form rendering
  component?: any; // React component
};

// Stores per placement
const uiByPlacement = new Map<Placement, PluginUIElement[]>();
// Snapshot map to keep stable identities
let snapshotMap: Map<Placement, PluginUIElement[]> = new Map();
const listeners = new Set<() => void>();
// Stable empty array to avoid new reference per getSnapshot call (do not mutate)
const EMPTY_UI: PluginUIElement[] = [];

function emit() {
  for (const l of Array.from(listeners)) {
    try { l(); } catch {}
  }
}

function setSnapshot() {
  const next = new Map<Placement, PluginUIElement[]>();
  for (const [k, arr] of uiByPlacement) next.set(k, arr.slice());
  snapshotMap = next;
}

export function registerUI(el: PluginUIElement) {
  if (!el || !el.id || !el.placement) return;
  const list = uiByPlacement.get(el.placement) || [];
  if (!list.find(x => x.id === el.id)) {
    list.push(el);
    uiByPlacement.set(el.placement, list);
    setSnapshot();
    emit();
  }
}

// Backward compatibility: toolbar button alias
export type ToolbarButton = { id: string; tooltip?: string; icon?: any; onClick: () => void | Promise<void> };
export function registerToolbarButton(btn: ToolbarButton) {
  registerUI({ id: btn.id, placement: 'app.toolbar', kind: 'button', tooltip: btn.tooltip, icon: btn.icon, onClick: btn.onClick });
}

export function usePluginUI(placement: Placement): PluginUIElement[] {
  function get() { return snapshotMap.get(placement) || EMPTY_UI; }
  function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
  return useSyncExternalStore(subscribe, get, get);
}

// TalkyAPI exposed to plugins
function getMessages() {
  const state = (useChatStore as any).getState?.();
  const msgs = state?.messages || [];
  return msgs.map((m: any, i: number) => ({ id: i, ...m }));
}

async function updateMessage(id: number, newText: string) {
  const state = (useChatStore as any).getState?.();
  const setState = (useChatStore as any).setState;
  if (!state || !setState) return;
  const msgs = [...(state.messages || [])];
  if (id < 0 || id >= msgs.length) return;
  msgs[id] = { ...msgs[id], text: newText };
  setState({ messages: msgs });
}

function showNotification(message: string, _opts?: { type?: 'info'|'success'|'warning'|'error' }) {
  try {
    notify(message, { type: _opts?.type });
  } catch (e) {
    console.info('[Plugin Notice]', message);
  }
}

export function getTalkyAPI() {
  return {
    React,
    registerToolbarButton,
    registerUI,
    getMessages: async () => getMessages(),
    updateMessage,
    invoke: tauriInvoke,
    showNotification,
  } as const;
}
