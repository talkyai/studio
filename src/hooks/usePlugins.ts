import { useEffect, useState } from 'react';

export function usePlugins() {
  const [plugins, setPlugins] = useState<any[]>([]);
  const [uiComponents, setUiComponents] = useState<Record<string, any>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const list: any[] = await invoke('plugins_get_plugins_list');
        setPlugins(list || []);

        // Prepare host API globally so plugin modules can reference TalkyAPI/React at module scope
        const runtime = await import('../plugins/runtime');
        const hostAPI = runtime.getTalkyAPI();
        ;(globalThis as any).TalkyAPI = hostAPI;
        ;(globalThis as any).__TalkyReact = hostAPI.React;

        const components: Record<string, any> = {};

        function transformReactImports(src: string): string {
          const reactExpr = "(globalThis.TalkyAPI && globalThis.TalkyAPI.React) || (globalThis.React)";
          // import React from 'react' | "react"
          src = src.replace(/import\s+React\s+from\s+["']react["'];?/g, `const React = ${reactExpr};`);
          // import * as React from 'react'
          src = src.replace(/import\s+\*\s+as\s+React\s+from\s+["']react["'];?/g, `const React = ${reactExpr};`);
          // import { useState, useEffect } from 'react'
          src = src.replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s*["']react["'];?/g, (...args) => { const group = args[1]; return `const { ${group} } = ${reactExpr};`; });
          // require('react') occurrences
          src = src.replace(/require\(\s*["']react["']\s*\)/g, reactExpr);
          return src;
        }

        for (const plugin of (list || []).filter((p: any) => p.enabled)) {
          const entry = plugin?.meta?.frontend?.entry || 'frontend/main.js';
          const id = plugin?.meta?.id;
          if (!id || !entry) continue;

          let module: any = null;
          try {
            let code: string = await invoke('plugins_get_frontend_code', { plugin_id: id, pluginId: id, entry });
            code = transformReactImports(code);
            const blob = new Blob([code], { type: 'text/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            try {
              module = await import(/* @vite-ignore */ blobUrl);
            } finally {
              URL.revokeObjectURL(blobUrl);
            }
          } catch (e0) {
            console.warn(`Failed to load UI for plugin ${id} using backend fetch only`, e0);
            continue;
          }

          if (module?.uiComponents) {
            Object.assign(components, module.uiComponents);
          }

          // Call optional init(TalkyAPI)
          let TalkyAPI: any = null;
          try {
            const runtime = await import('../plugins/runtime');
            TalkyAPI = runtime.getTalkyAPI();
            const initFn = module?.init || module?.default?.init;
            if (typeof initFn === 'function') {
              await initFn(TalkyAPI);
            }
            // Auto-register from metadata.frontend.ui when simple command actions are provided
            try {
              const uiMeta = plugin?.meta?.frontend?.ui;
              const registerUI = (runtime as any).registerUI as (el: any) => void;
              const knownPlacements = new Set(['app.toolbar','chat.inputBar','chat.underUserMessage','chat.underAIMessage','chat.aboveLocalModelStatus','settings.panel']);
              if (uiMeta && registerUI && (String(plugin?.meta?.plugin_type || '').toLowerCase() !== 'background')) {
                // Legacy toolbar array
                if (Array.isArray(uiMeta?.toolbar)) {
                  for (const item of uiMeta.toolbar) {
                    if (item && item.id) {
                      // For toolbar, auto-register only if explicit args provided; otherwise let plugin code handle logic
                      const hasArgs = item && item.args && typeof item.args === 'object' && Object.keys(item.args).length > 0;
                      const click = item.command && hasArgs ? (() => TalkyAPI.invoke(String(item.command), item.args || {})) : undefined;
                      if (click) {
                        registerUI({ id: `${id}:${item.id}`, placement: 'app.toolbar', kind: item.kind || 'button', tooltip: item.tooltip, icon: item.icon, onClick: click });
                      }
                    }
                  }
                }
                // Generic placements map
                if (uiMeta?.placements && typeof uiMeta.placements === 'object') {
                  for (const [place, arr] of Object.entries(uiMeta.placements)) {
                    if (!knownPlacements.has(place)) continue;
                    if (Array.isArray(arr)) {
                      for (const item of arr) {
                        if (!item || !item.id) continue;
                        const hasArgs = item && item.args && typeof item.args === 'object' && Object.keys(item.args).length > 0;
                        const click = item.command && hasArgs ? (() => TalkyAPI.invoke(String(item.command), item.args || {})) : undefined;
                        if (click) {
                          registerUI({ id: `${id}:${item.id}`, placement: place as any, kind: item.kind || 'button', tooltip: item.tooltip, icon: item.icon, onClick: click });
                        }
                      }
                    }
                  }
                }
              }
            } catch (e) {
              console.warn(`Plugin ${id} auto-register from metadata.ui failed`, e);
            }
          } catch (e) {
            console.warn(`Plugin ${id} init failed`, e);
          }
        }

        setUiComponents(components);
      } catch (e) {
        console.warn('usePlugins: failed to load plugins', e);
      }
    };

    load();
  }, []);

  return { plugins, uiComponents };
}