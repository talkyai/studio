# TalkyAI Studio — Plugin System (API, metadata.json, Tauri commands)

This document describes the plugin system for TalkyAI Studio: how plugins are discovered and loaded, the `metadata.json` schema, supported UI placements, the JavaScript runtime API (TalkyAPI), and the available `#[tauri::command]` calls you can invoke from the frontend.

Doc version: 2025‑08‑14.


## Architecture Overview

The plugin system consists of:
- User plugins directory: `%APP_DATA%/com.ctapu.TalkyAIStudio/plugins/<pluginId>` (Windows example: `C:\Users\<user>\AppData\Roaming\com.ctapu.TalkyAIStudio\plugins\...`).
- Built-in plugins: packaged into app resources: `resources/plugins/<pluginId>`. On first launch, they are copied into the user plugins dir if missing.
- Frontend loader: `src/hooks/usePlugins.ts`
  - queries backend for plugin list
  - loads each plugin’s frontend JS module
  - calls optional `init(TalkyAPI)`
  - auto-registers simple UI buttons declared in `metadata.json` (see UI autogeneration below)
- Plugin UI runtime: `src/plugins/runtime.ts` — shared registry for plugin UI elements and the JS TalkyAPI.
- Host renderers for placements:
  - Top toolbar: `PluginToolbarButtons` (placement: `app.toolbar`)
  - Above local model status: `PluginAboveLocalModelStatus` (`chat.aboveLocalModelStatus`)
  - Under chat messages: `PluginMessageActions` (`chat.underUserMessage`, `chat.underAIMessage`)
  - Above input bar: `PluginInputArea` (`chat.inputBar`)
  - Settings panel: `PluginSettingsPanel` (`settings.panel`)


## Lifecycle & File Locations

- Installing external plugin (ZIP):
  1) App calls `plugins_install_plugin(zipPath)`.
  2) Backend extracts the zip (supports `metadata.json` in the zip root or inside a top-level folder), then moves the content to `%APP_DATA%/.../plugins/<id>`.
  3) Plugin appears in the list and can be enabled/disabled.

- Built-in plugins:
  - Source lives under `src-tauri/src/plugins/<pluginId>`.
  - Copied into `resources/plugins/<pluginId>` during the build (see `src-tauri/build.rs`).
  - On startup, copied into `%APP_DATA%/.../plugins` if missing.

- Loading plugin frontend code:
  - Prefer Tauri command `plugins_get_frontend_code(plugin_id, entry)` (loader fetches text and imports as a Blob URL).
  - Fallbacks: `appDataDir` → `resourceDir` → Vite dev-resources.
  - After install/enable/disable/delete, changes apply immediately by reloading the app page.


## `metadata.json` — schema and example

Key fields:
- `id`: string — unique plugin ID (and installation folder name).
- `name`: string — human-readable name.
- `version`: string — version.
- `description?`: string
- `author?`: string
- `icon?`: string — path to an icon bundled with the plugin.
- `plugin_type?`: "action" | "background"
  - `action`: requires user interaction (buttons etc.)
  - `background`: always on, may have no UI; UI autogeneration from metadata is disabled for background.
- `frontend?`: {
  - `entry?`: string — JS entry (default `frontend/main.js`)
  - `permissions?`: string[] — declarative only (informational)
  - `ui?`: {
    - `toolbar?`: Array<UIItem> — legacy convenience for top toolbar
    - `placements?`: { [placement: string]: Array<UIItem> }
  }
}
- `backend?`: {
  - `entry?`: string — path to Rust backend (for built-ins)
  - `permissions?`: string[]
}

UIItem fields (for `toolbar` and `placements`):
- `id`: string
- `kind?`: "button" | "group" | "dropdown" | "form" | "custom" (default "button")
- `tooltip?`: string
- `icon?`: string
- `command?`: string — name of a `#[tauri::command]` to call on click (used only when all args are known upfront)
- `args?`: object — arguments for `command`

Supported placements (Placement):
- `app.toolbar`
- `chat.inputBar`
- `chat.underUserMessage`
- `chat.underAIMessage`
- `chat.aboveLocalModelStatus`
- `settings.panel`

Example `metadata.json`:
```json
{
  "id": "code-formatter",
  "name": "Code Formatter",
  "version": "1.0.0",
  "description": "Built-in code formatting functionality",
  "author": "Your Company",
  "icon": "assets/icon.png",
  "plugin_type": "action",
  "frontend": {
    "entry": "frontend/main.js",
    "permissions": ["messages", "ui"],
    "ui": {
      "toolbar": [
        { "id": "format-code", "tooltip": "Format code", "icon": "assets/format-icon.svg", "command": "your_command", "args": {} }
      ],
      "placements": {
        "chat.underAIMessage": [
          { "id": "format-last-ai-message", "tooltip": "Format this message", "kind": "button", "command": "your_command", "args": {} }
        ]
      }
    }
  }
}
```
Note: `args` above are illustrative. When you need dynamic values (e.g., message text), register UI from `init()` and implement the logic yourself.


## Frontend module of a plugin

ES module may export:
- `export async function init(TalkyAPI) { ... }` — optional initialization (register UI, subscribe, etc.).
- `export const uiComponents = { ... }` — optional; host does not auto-render, but can be useful for sharing between your elements.

Minimal example `frontend/main.js`:
```js
export async function init(TalkyAPI) {
  TalkyAPI.registerToolbarButton({
    id: 'format-code',
    tooltip: 'Format code',
    onClick: async () => {
      const messages = await TalkyAPI.getMessages();
      const last = messages[messages.length - 1];
      if (last && last.sender === 'ai') {
        // Example: call your backend command or perform client-side transformation
        const formatted = String(last.text);
        await TalkyAPI.updateMessage(last.id, formatted);
        TalkyAPI.showNotification('Formatted successfully!', { type: 'success' });
      }
    },
  });
}
```


## JS Runtime API (TalkyAPI)

`TalkyAPI` is passed into `init(TalkyAPI)` and contains:
- `React`
  - React instance provided by the host. Use this instead of `import React from 'react'` in plugins.
- `registerToolbarButton({ id, tooltip?, icon?, onClick })`
  - Shorthand for registering a top toolbar button (equivalent to `registerUI` with placement `app.toolbar`).
- `registerUI({ id, placement, kind?, label?, tooltip?, icon?, onClick?, items?, component? })`
  - General API to register elements across all placements.
- `getMessages(): Promise<Array<{ id: number, text: string, sender: 'user'|'ai', meta?: any }>>`
- `updateMessage(id: number, newText: string): Promise<void>`
- `invoke(name: string, args?: any): Promise<any>`
  - Proxy to `@tauri-apps/api/core` `invoke`.
- `showNotification(message: string, opts?: { type?: 'info'|'success'|'warning'|'error' })`
  - Shows an in-app Snackbar notification. Types supported: `info`, `success`, `warning`, `error`.

For actions under messages (`chat.under*Message`) the click handler receives a context object:
- `ctx.index: number` — message index
- `ctx.message` — the full message object


## UI Autogeneration from metadata

The loader (`usePlugins.ts`) can auto-generate simple buttons from `metadata.frontend.ui`:
- Section `toolbar`: for each item with `command` and non-empty `args`, a button is added to `app.toolbar`; clicking invokes `TalkyAPI.invoke(command, args)`.
- Section `placements`: same logic for each placement.
- If `plugin_type` = `background`, the UI autogeneration is disabled.

Use manual registration from `init()` when arguments must be computed dynamically.


## Host UI Rendering

- Top toolbar: `PluginToolbarButtons` renders `app.toolbar` items.
- Above local model status: `PluginAboveLocalModelStatus` renders `chat.aboveLocalModelStatus`.
- Under chat messages: `PluginMessageActions` renders `chat.underUserMessage` and `chat.underAIMessage`.
- Above input: `PluginInputArea` renders `chat.inputBar`.
- Settings panel: `PluginSettingsPanel` renders `settings.panel` and supports `button`, `group`, `form`, `custom` kinds.


## Practical Tips

- The frontend module must be ES-module compatible (dynamic `import()`), without Node-specific APIs.
- Keep resource paths (icons etc.) relative to the plugin root.
- If you need to render files from disk, use Tauri `convertFileSrc` only when necessary for UI rendering.
- ZIP plugins must include `metadata.json` either in the root or in a single top folder.


## Tauri Commands (`#[tauri::command]`)

Available from the frontend via `TalkyAPI.invoke(name, args)`:

Group: Generic HTTP providers (`src-tauri/src/api.rs`)
- `query_deepseek(api_key: String, base_url: String, model: String, prompt: String) -> String`
- `query_openai(api_key: String, base_url: String, model: String, prompt: String) -> String`

Group: llama.cpp (local server)
- `backends::llama_cpp::server::start_llamacpp_server(app: AppHandle, model_path: String, variant: String, port: u16) -> ()`
- `backends::llama_cpp::server::stop_llamacpp_server(app: AppHandle) -> ()`
- `backends::llama_cpp::query::query_llamacpp(app: AppHandle, prompt: String, port: u16, temperature?: f32, top_k?: i32, top_p?: f32, min_p?: f32, max_tokens?: i32, repeat_last_n?: i32, messages?: serde_json::Value) -> String`
- `backends::llama_cpp::models::model_exists(app: AppHandle, file_name: String) -> bool`
- `backends::llama_cpp::models::resolve_model_path(app: AppHandle, file_name: String) -> String`
- `backends::llama_cpp::models::list_models(app: AppHandle) -> Vec<String>`
- `backends::llama_cpp::download::download_model_file(app: AppHandle, url: String, file_name: String, window: Window) -> String`

Group: Binaries/servers installation (`src-tauri/src/download.rs`)
- `download_server_binaries(app: AppHandle, server: String, variant: String, os_override?: String, window: Window) -> String`
- `download_llama_binaries(app: AppHandle, variant: String, window: Window) -> String`
- `check_binary_installed(app: AppHandle, server: String, variant: String) -> bool`

Group: Ollama
- `backends::ollama::server::start_ollama_server(app: AppHandle) -> ()`
- `backends::ollama::models::list_ollama_models(base_url: String) -> Vec<String>`
- `backends::ollama::models::pull_ollama_model(base_url: String, model: String, window: Window) -> ()`
- `backends::ollama::query::query_ollama(base_url: String, model: String, prompt: String, messages?: Vec<{role,content}>, temperature?: f32, top_k?: i32, top_p?: f32, max_tokens?: i32, advanced_params?: serde_json::Value) -> String`

Group: Database / settings (`src-tauri/src/db.rs`)
- `load_settings(app: AppHandle) -> SettingsPayload`
- `save_settings(app: AppHandle, settings: SettingsPayload) -> ()`
- `save_prompt(app: AppHandle, content: String) -> ()`
- `list_prompts(app: AppHandle, limit?: i64) -> Vec<PromptRow>`
- `list_projects(app: AppHandle, work_mode?: String) -> Vec<ProjectRow>`
- `save_project(app: AppHandle, project: { name: String, work_mode?: String, context_folder?: String }) -> i64`
- `delete_project(app: AppHandle, id: i64) -> ()`
- `save_project_prompt(app: AppHandle, project_id: i64, content: String) -> ()`
- `list_project_prompts(app: AppHandle, project_id: i64, limit?: i64) -> Vec<ProjectPromptRow>`

Group: Context / System
- `context::scan_context_folder(path: String, file_size_limit?: u64, total_size_limit?: u64, max_files?: usize) -> String`
- `system::get_system_usage(state: State<SystemState>) -> { cpu_percent, mem_used, mem_total, gpus: [] }`

Group: Plugins
- `plugins_get_plugins_list(app: AppHandle) -> Vec<Plugin>`
- `plugins_install_plugin(app: AppHandle, zip_path: String) -> ()`
- `plugins_toggle_plugin(app: AppHandle, plugin_id: String, enable: bool) -> ()`
- `plugins_delete_plugin(app: AppHandle, plugin_id: String) -> ()`
- `plugins_get_frontend_code(app: AppHandle, plugin_id: String, entry?: String) -> String`

Misc
- `open_devtools(window: WebviewWindow)` — opens DevTools (debug mode)

Notes:
- All commands are called from the frontend via `await TalkyAPI.invoke('command_name', { ...args })`.
- Object argument names should match the Rust function parameters (snake_case).
- Commands that need `Window`/`AppHandle` obtain them automatically when invoked from the WebView.


## Where to look in the code

- Loader and runtime:
  - `src/hooks/usePlugins.ts`
  - `src/plugins/runtime.ts`
- UI renderers:
  - `src/components/plugins/*`
- Backend (plugin management):
  - `src-tauri/src/plugins/mod.rs`
- Example plugin:
  - `example/ui-placements-demo/*`


## Developer Tools

- Press F12 in the app window to open the developer tools (DevTools).
- Alternatively, you can open it programmatically from plugins or the app via: `await TalkyAPI.invoke('open_devtools')`.
