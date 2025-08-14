# TalkyAI Studio — Система плагинов (API, metadata.json, команды Tauri)

Этот документ описывает, как устроена система плагинов TalkyAI Studio, как создавать и подключать плагины, что такое `metadata.json`, какие UI‑площадки доступны, какой JavaScript‑рантайм API предоставляется (TalkyAPI), а также какие команды `#[tauri::command]` можно вызывать из фронтенда (через `TalkyAPI.invoke`).

Док актуален для версии приложения, соответствующей этому репозиторию на дату 2025‑08‑14.


## Обзор архитектуры

Система плагинов состоит из следующих частей:
- Директория плагинов пользователя: `%APP_DATA%/com.ctapu.TalkyAIStudio/plugins/<pluginId>` (Windows: `C:\Users\<user>\AppData\Roaming\com.ctapu.TalkyAIStudio\plugins\...`).
- Встроенные плагины: упакованы в ресурсы приложения: `resources/plugins/<pluginId>`. При первом запуске встроенные плагины копируются в пользовательскую директорию.
- Загрузчик плагинов на фронтенде: `src/hooks/usePlugins.ts` —
  - получает список плагинов из бэкенда;
  - загружает JS‑модуль фронтенда плагина (из appDataDir, resourceDir или через возврат кода командой Tauri);
  - вызывает опциональную функцию `init(TalkyAPI)`;
  - регистрирует UI‑элементы, объявленные в `metadata.json` (см. раздел «Автогенерация UI из metadata»).
- Рантайм UI плагинов: `src/plugins/runtime.ts` — общий интерфейс для регистрации UI‑элементов в разных местах приложения, плюс JS‑API `TalkyAPI` для плагинов.
- Рендереры UI для размещений:
  - Верхняя панель инструментов: `PluginToolbarButtons` (placement: `app.toolbar`)
  - Над статусом локальной модели: `PluginAboveLocalModelStatus` (`chat.aboveLocalModelStatus`)
  - Действия под сообщениями в чате: `PluginMessageActions` (`chat.underUserMessage`, `chat.underAIMessage`)
  - Панель над инпутом чата: `PluginInputArea` (`chat.inputBar`)
  - Панель настроек: `PluginSettingsPanel` (`settings.panel`)


## Жизненный цикл и расположения файлов

- Установка внешнего плагина:
  1) В приложении вызывается команда `plugins_install_plugin(zipPath)`.
  2) Бэкенд распаковывает zip (поддерживаются оба варианта: `metadata.json` в корне архива или в корневой папке архива), находит `metadata.json`, переносит содержимое в директорию `%APP_DATA%/…/plugins/<id>`.
  3) Плагин появляется в списке плагинов, можно включить/выключить.

- Встроенные плагины:
  - Исходники лежат в `src-tauri/src/plugins/<pluginId>`.
  - На сборке копируются в `resources/plugins/<pluginId>` (см. `src-tauri/build.rs`).
  - При старте приложение копирует их в `%APP_DATA%/…/plugins` при отсутствии.

- Загрузка фронтенд‑кода плагина:
  - Предпочтительно через Tauri‑команду `plugins_get_frontend_code(plugin_id, entry)` которую вызывает `usePlugins.ts`, далее модуль подключается как `Blob URL`.
  - Фоллбеки: `appDataDir` → `resourceDir` → dev‑ресурсы Vite.
  - После установки/включения/выключения/удаления плагинов изменения применяются сразу — страница приложения автоматически перезагружается.


## metadata.json — схема и пример

Файл `metadata.json` находится в корне плагина и описывает метаданные, точки входа и UI‑размещения.

Схема (ключевые поля):
- id: string — уникальный идентификатор плагина (имя папки установки).
- name: string — человекочитаемое имя.
- version: string — версия.
- description?: string — описание.
- author?: string — автор.
- icon?: string — путь к иконке внутри плагина (произвольный файл).
- plugin_type?: "action" | "background"
  - action — требует пользовательских действий (кнопки и т.п.).
  - background — всегда активен, UI может отсутствовать. Важно: для background автогенерация UI из metadata по умолчанию отключена.
- frontend?: {
  - entry?: string — JS‑вход (по умолчанию `frontend/main.js`).
  - permissions?: string[] — декларативный список прав (информативно).
  - ui?: {
    - toolbar?: Array<UIItem> — устаревшее краткое объявление для верхней панели.
    - placements?: { [placement: string]: Array<UIItem> } — размещения (см. ниже список допустимых).
  }
}
- backend?: {
  - entry?: string — путь к Rust‑коду бэкенда (для встроенных плагинов проекта).
  - permissions?: string[]
}

UIItem (для toolbar и placements):
- id: string
- kind?: "button" | "group" | "dropdown" | "form" | "custom" (по умолчанию "button")
- tooltip?: string
- icon?: string
- command?: string — имя `#[tauri::command]`, если UI должен автоматически вызывать его.
- args?: object — аргументы для `command`. Если `args` отсутствует, автогенерация обработчика клика не произойдёт, и вам следует зарегистрировать действие вручную в `init()` через `TalkyAPI.registerUI`/`registerToolbarButton`.

Поддерживаемые размещения (Placement):
- app.toolbar
- chat.inputBar
- chat.underUserMessage
- chat.underAIMessage
- chat.aboveLocalModelStatus
- settings.panel

Пример `metadata.json`:
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
Примечание: поля `args` в примере иллюстративные — фактические данные (например, код сообщения) обычно подставляются вашей функцией‑обработчиком при клике. Автогенерация кликов из metadata используется только когда заранее известны все аргументы.


## Фронтенд модуля плагина

Фронтенд‑вход — ES‑модуль, который может экспортировать:
- `export async function init(TalkyAPI) { ... }` — инициализация (регистрация кнопок, подписки и т.п.).
- `export const uiComponents = { /* произвольные React-компоненты по ключам */ }` — (опционально) словарь компонентов, которые могут быть использованы внутри вашего собственного кода; хост их не рендерит автоматически, но может быть полезно для реюза.

Минимальный пример `frontend/main.js`:
```js
export async function init(TalkyAPI) {
  TalkyAPI.registerToolbarButton({
    id: 'format-code',
    tooltip: 'Format code',
    onClick: async () => {
      const messages = await TalkyAPI.getMessages();
      const last = messages[messages.length - 1];
      if (last && last.sender === 'ai') {
        const formatted = await TalkyAPI.invoke('your_command', { /* args */ });
        await TalkyAPI.updateMessage(last.id, formatted);
        TalkyAPI.showNotification('Code formatted successfully!');
      }
    }
  });
}
```


## JS‑рантайм API (TalkyAPI)

Объект `TalkyAPI` передаётся в `init(TalkyAPI)` ваших плагинов и содержит:
- `React`
  - Экземпляр React, предоставляемый хостом. Используйте его вместо `import React from 'react'` внутри плагина.
- `registerToolbarButton({ id, tooltip?, icon?, onClick })`
  - Упрощённая регистрация кнопки на верхней панели (эквивалент `registerUI` с placement `app.toolbar`).
- `registerUI({ id, placement, kind?, label?, tooltip?, icon?, onClick?, items?, component? })`
  - Универсальная регистрация элементов во всех поддерживаемых размещениях.
  - `placement`: одно из значений в списке Placement (см. «metadata.json — схема»).
  - Для `group`/`dropdown` используйте массив `items` с такими же полями (`onClick(ctx)` и т.п.).
  - Для `form`/`custom` укажите собственный React‑компонент в `component`.
- `getMessages(): Promise<Array<{ id: number, text: string, sender: 'user'|'ai', meta?: any }>>`
  - Возвращает сообщения из текущего чата (с `id` как индекс).
- `updateMessage(id: number, newText: string): Promise<void>`
  - Обновляет текст сообщения по индексу.
- `invoke(name: string, args?: any): Promise<any>`
  - Проксирует вызов `@tauri-apps/api/core` → `invoke`.
- `showNotification(message: string, opts?: { type?: 'info'|'success'|'warning'|'error' })`
  - Показывает нативное уведомление внутри приложения (Snackbar). Поддерживаются типы: `info`, `success`, `warning`, `error`. Предпочтительно использовать этот метод для быстрых уведомлений пользователю.

Контекст клика в компонентах под сообщениями (placement: `chat.under*Message`) передаётся в обработчик `onClick(ctx)` и содержит:
- `ctx.index: number` — индекс сообщения;
- `ctx.message` — объект сообщения целиком.


## Автогенерация UI из metadata

Загрузчик (`usePlugins.ts`) может автоматически сгенерировать простые кнопки по описанию в `metadata.frontend.ui`:
- Раздел `toolbar`: для каждой записи с `command` и непустым объектом `args` будет добавлена кнопка на `app.toolbar`, по клику будет вызван `TalkyAPI.invoke(command, args)`.
- Раздел `placements`: аналогично, но для конкретных размещений. В список попадают только записи, у которых есть `command` и непустые `args`.
- Если `plugin_type` = `background`, автогенерация UI не выполняется (ожидается, что такой плагин работает в фоне без UI).

Если вам нужно динамически вычислять аргументы или контекст (например, подставлять код из последнего сообщения), регистрируйте элементы вручную из `init()` через `registerUI` / `registerToolbarButton`.


## Рендеринг UI в хост‑приложении

- Верхняя панель инструментов: `PluginToolbarButtons` рендерит элементы placement `app.toolbar`.
- Над блоком статуса локальной модели: `PluginAboveLocalModelStatus` — `chat.aboveLocalModelStatus`.
- Под сообщениями чата: `PluginMessageActions` — `chat.underUserMessage` и `chat.underAIMessage` (контекст клика включает индекс и само сообщение).
- Над строкой ввода: `PluginInputArea` — `chat.inputBar`.
- В настройках: `PluginSettingsPanel` — `settings.panel` (поддерживает типы: `button`, `group`, `form`, `custom`).


## Практические советы

- Модуль фронтенда должен быть ES‑совместимым (динамический `import()`), без Node‑специфичных API.
- Пути к ресурсам внутри плагина (иконки и т.п.) лучше хранить относительными к корню плагина.
- Если необходимо получить путь к файлам, которые нужно читать из фронтенда, используйте Tauri `convertFileSrc` только когда действительно нужно отрисовать файл (обычно JS модуль мы берем через Tauri команду как текст).
- Для ZIP‑плагинов убедитесь, что в архиве есть `metadata.json` в корне или в единственной верхней папке.


## Команды Tauri (#[tauri::command])

Ниже список команд, доступных из фронтенда через `TalkyAPI.invoke(name, args)`.

Группа: Общие HTTP‑провайдеры (src-tauri/src/api.rs)
- `query_deepseek(api_key: String, base_url: String, model: String, prompt: String) -> String`
- `query_openai(api_key: String, base_url: String, model: String, prompt: String) -> String`

Группа: llama.cpp (локальный сервер)
- `backends::llama_cpp::server::start_llamacpp_server(app: AppHandle, model_path: String, variant: String, port: u16) -> ()`
- `backends::llama_cpp::server::stop_llamacpp_server(app: AppHandle) -> ()`
- `backends::llama_cpp::query::query_llamacpp(app: AppHandle, prompt: String, port: u16, temperature?: f32, top_k?: i32, top_p?: f32, min_p?: f32, max_tokens?: i32, repeat_last_n?: i32, messages?: serde_json::Value) -> String`
- `backends::llama_cpp::models::model_exists(app: AppHandle, file_name: String) -> bool`
- `backends::llama_cpp::models::resolve_model_path(app: AppHandle, file_name: String) -> String`
- `backends::llama_cpp::models::list_models(app: AppHandle) -> Vec<String>`
- `backends::llama_cpp::download::download_model_file(app: AppHandle, url: String, file_name: String, window: Window) -> String`

Группа: Установка бинарников/серверов (src-tauri/src/download.rs)
- `download_server_binaries(app: AppHandle, server: String, variant: String, os_override?: String, window: Window) -> String`
- `download_llama_binaries(app: AppHandle, variant: String, window: Window) -> String`
- `check_binary_installed(app: AppHandle, server: String, variant: String) -> bool`

Группа: Ollama
- `backends::ollama::server::start_ollama_server(app: AppHandle) -> ()`
- `backends::ollama::models::list_ollama_models(base_url: String) -> Vec<String>`
- `backends::ollama::models::pull_ollama_model(base_url: String, model: String, window: Window) -> ()`
- `backends::ollama::query::query_ollama(base_url: String, model: String, prompt: String, messages?: Vec<{role,content}>, temperature?: f32, top_k?: i32, top_p?: f32, max_tokens?: i32, advanced_params?: serde_json::Value) -> String`

Группа: База данных / настройки (src-tauri/src/db.rs)
- `load_settings(app: AppHandle) -> SettingsPayload`
- `save_settings(app: AppHandle, settings: SettingsPayload) -> ()`
- `save_prompt(app: AppHandle, content: String) -> ()`
- `list_prompts(app: AppHandle, limit?: i64) -> Vec<PromptRow>`
- `list_projects(app: AppHandle, work_mode?: String) -> Vec<ProjectRow>`
- `save_project(app: AppHandle, project: { name: String, work_mode?: String, context_folder?: String }) -> i64`
- `delete_project(app: AppHandle, id: i64) -> ()`
- `save_project_prompt(app: AppHandle, project_id: i64, content: String) -> ()`
- `list_project_prompts(app: AppHandle, project_id: i64, limit?: i64) -> Vec<ProjectPromptRow>`

Группа: Контекст / Система
- `context::scan_context_folder(path: String, file_size_limit?: u64, total_size_limit?: u64, max_files?: usize) -> String`
- `system::get_system_usage(state: State<SystemState>) -> { cpu_percent, mem_used, mem_total, gpus: [] }`

Группа: Плагины
- `plugins_get_plugins_list(app: AppHandle) -> Vec<Plugin>`
- `plugins_install_plugin(app: AppHandle, zip_path: String) -> ()`
- `plugins_toggle_plugin(app: AppHandle, plugin_id: String, enable: bool) -> ()`
- `plugins_delete_plugin(app: AppHandle, plugin_id: String) -> ()`
- `plugins_get_frontend_code(app: AppHandle, plugin_id: String, entry?: String) -> String`


Примечания:
- Все команды вызываются из фронтенда через `await TalkyAPI.invoke('command_name', { ...args })`.
- Аргументы объектов должны соответствовать именам параметров функции в Rust (snake_case).
- Команды, требующие `Window`/`AppHandle`, получают их автоматически через Tauri при вызове из вебвью.


## Пример полного плагина (минимум)

Структура:
```
my-plugin/
  metadata.json
  frontend/
    main.js
  assets/
    icon.svg
```

metadata.json:
```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "0.1.0",
  "plugin_type": "action",
  "frontend": {
    "entry": "frontend/main.js",
    "ui": {
      "placements": {
        "app.toolbar": [ { "id": "hello", "tooltip": "Say hello" } ]
      }
    }
  }
}
```

frontend/main.js:
```js
export async function init(TalkyAPI) {
  TalkyAPI.registerUI({
    id: 'my-plugin:hello',
    placement: 'app.toolbar',
    kind: 'button',
    tooltip: 'Say hello',
    onClick: () => TalkyAPI.showNotification('Hello from my-plugin!')
  });
}
```

Упаковка в ZIP: достаточно заархивировать папку с `metadata.json` (можно с верхним каталогом), затем установить через менеджер плагинов в настройках.


## Ограничения и безопасность

- Поле `permissions` носит декларативный характер и не реализует sandbox на уровне хоста — ответственность плагина действовать корректно.
- Плагины исполняются в контексте вебвью Tauri, доступ к системным ресурсам возможен только через явно вызванные Tauri‑команды.
- Не используйте в плагине потенциально опасные операции без подтверждения пользователя.


## Где почитать в коде

- Загрузчик и рантайм:
  - `src/hooks/usePlugins.ts`
  - `src/plugins/runtime.ts`
- Рендереры UI:
  - `src/components/plugins/*`
- Бэкенд (управление плагинами):
  - `src-tauri/src/plugins/mod.rs`
- Пример плагина:
  - `example/ui-placements-demo/*`

Если обнаружите несоответствие документации и поведения, ориентируйтесь на исходный код и открывайте issue/PR.
