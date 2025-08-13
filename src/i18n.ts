import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ru: {
    translation: {
      app: {
        noProject: 'Проект не выбран',
        title: 'TalkyAI Studio',
        tabs: { chat: 'Чат', settings: 'Настройки' },
        toggleTheme: 'Сменить тему',
        language: 'Язык',
        projectLabel: 'Проект'
      },
      chat: {
        needServer: 'Для использования локального режима необходимо установить сервер.',
        goSettings: 'Перейти в настройки',
        sendingPlaceholder: 'Введите сообщение',
        startingServer: 'Запускаем сервер...',
        send: 'Отправить',
        localModel: 'Локальная модель',
        startServer: 'Запустить сервер',
        serverStarting: 'Сервер запускается',
        stopServer: 'Остановить сервер',
        repository: 'Репозиторий'
      },
      settings: {
        workMode: 'Режим работы',
        deepseek: 'DeepSeek API',
        openai: 'OpenAI API (совместимый)',
        local: 'Локальная модель',
        deepseekUrl: 'DeepSeek URL',
        deepseekApiKey: 'DeepSeek API Key',
        deepseekCustomModel: 'Своя модель',
        apiBaseUrl: 'API Base URL',
        apiModel: 'Модель',
        apiKey: 'API Key',
        customModel: 'Своя модель',
        repoLabel: 'Репозиторий модели (GGUF)',
        repoPlaceholder: 'Например: bartowski/Llama-3.2-3B-Instruct-GGUF:Q8_0',
        fileLabel: 'Имя GGUF файла',
        filePlaceholder: 'Например: bartowski/Llama-3.2-3B-Instruct-GGUF_Q8_0.gguf',
        serverInstall: 'Установка сервера',
        serverVariant: 'Версия сервера',
        os: 'ОС',
        installServer: 'Установить сервер',
        downloading: 'Скачивание...',
        serverPort: 'Порт сервера',
        temperatureLabel: 'temperature',
        temperatureHelp: 'Управляет случайностью генерации. Больше = случайнее',
        topKLabel: 'top_k',
        topKHelp: 'Оставляет только k лучших токенов',
        topPLabel: 'top_p',
        topPHelp: 'Ограничивает кумулятивной вероятностью p',
        minPLabel: 'min_p',
        minPHelp: 'Минимальная вероятность относительно самого вероятного токена',
        maxTokensLabel: 'max_tokens',
        maxTokensHelp: 'Максимум токенов на выход (-1 = без ограничений)',
        repeatLastNLabel: 'Последние n токенов для штрафа повторов',
        pasteToFileLengthLabel: 'Длина вставки в файл',
        pasteToFileLengthHelp: 'При длинной вставке текст сохраняется в файл (0 = отключить)',
        parsePdfAsImageLabel: 'Парсить PDF как изображение вместо текста',
        provider: 'Провайдер',
        ollamaBaseUrl: 'Ollama Base URL',
        modelLabel: 'Модель',
        customOption: 'Свой вариант',
        refreshList: 'Обновить',
        loading: 'Загрузка…',
        contextFolder: 'Папка контекста',
        contextFolderHelp: 'Файлы из этой папки будут добавляться к каждому сообщению',
        chooseFolder: 'Выбрать',
        clear: 'Очистить'
      },
      status: {
        inProgress: 'В процессе',
        extracting: 'Распаковка',
        done: 'Готово',
        error: 'Ошибка',
        waiting: 'Ожидание',
        serverTitle: '',
        startingOllama: 'Запуск Ollama... ',
        loadingModel: 'Загружаем модель…',
        ollamaStarted: 'Ollama запущен',
        steps: {
          downloadBinaries: 'Скачивание бинарников',
          unpack: 'Распаковка',
          ready: 'Готово'
        }
      },
      errors: {
        ollamaNotInstalled: 'Ollama не установлен. Установите сервер на вкладке «Установка сервера».',
        ollamaStartConfirmFailed: 'Не удалось подтвердить запуск Ollama. Проверьте логи/порт.',
        ollamaStartError: 'Ошибка запуска Ollama: {{error}}',
        modelDownloadError: 'Ошибка загрузки модели: {{error}}',
        serverNotRunning: 'Сервер не запущен'
      },
      projects: {
        title: 'Проекты',
        nameLabel: 'Название проекта',
        saveCurrent: 'Сохранить текущую конфигурацию',
        empty: 'Проектов пока нет. Создайте первый проект, чтобы быстро переключаться между конфигурациями.',
        mode: 'Режим',
        provider: 'Провайдер',
        server: 'Сервер',
        model: 'Модель',
        active: 'Активен',
        activate: 'Активировать',
        open: 'Открыть',
        delete: 'Удалить',
        deleteProject: 'Удалить проект',
        projectChip: 'Проект',
        configsCount: 'Конфигураций: {{count}}',
        unnamed: '(без имени)',
        summaryPattern: 'Режим: {{mode}} • Провайдер: {{provider}} • Сервер: {{server}}',
        none: 'Нет проекта'
      },
      ctx: {
        title: 'Контекст',
        attach: 'Контекст',
        fromFiles: 'Вставить файлы',
        fromFolderTree: 'Дерево папки'
      },
      dev: {
        insertPrompt: 'Подсказка разработчику'
      },
      monitor: {
        tooltip: 'Мониторинг использования RAM/CPU'
      },
      common: {
        expand: 'Развернуть',
        collapse: 'Свернуть',
        showDetails: 'Показать детали',
        hideDetails: 'Скрыть детали',
        loading: 'Загрузка…'
      },
      meta: {
        model: 'Модель',
        usage: {
          prompt_tokens: 'Токены промпта',
          completion_tokens: 'Токены продолжения',
          total_tokens: 'Всего токенов'
        },
        timings: {
          prompt_ms: 'Время промпта, мс',
          predicted_ms: 'Время генерации, мс',
          prompt_n: 'Токенов в промпте',
          predicted_n: 'Сгенерировано токенов'
        }
      }
    }
  },
  en: {
    translation: {
      app: {
        noProject: 'Project not selected',
        title: 'TalkyAI Studio',
        tabs: { chat: 'Chat', settings: 'Settings' },
        toggleTheme: 'Toggle theme',
        language: 'Language',
        projectLabel: 'Project'
      },
      chat: {
        needServer: 'To use local mode, you need to install the server.',
        goSettings: 'Go to settings',
        sendingPlaceholder: 'Type a message',
        startingServer: 'Starting server...',
        send: 'Send',
        localModel: 'Local model',
        startServer: 'Start server',
        serverStarting: 'Server is starting…',
        stopServer: 'Stop server',
        repository: 'Repository'
      },
      settings: {
        workMode: 'Work mode',
        deepseek: 'DeepSeek API',
        openai: 'OpenAI-compatible API',
        local: 'Local model',
        deepseekUrl: 'DeepSeek URL',
        deepseekApiKey: 'DeepSeek API Key',
        deepseekCustomModel: 'Custom model',
        apiBaseUrl: 'API Base URL',
        apiModel: 'Model',
        apiKey: 'API Key',
        customModel: 'Custom model',
        repoLabel: 'Model repository (GGUF)',
        repoPlaceholder: 'e.g., ggml-org/gemma-2-2b-it-GGUF',
        fileLabel: 'GGUF file name',
        filePlaceholder: 'e.g., gemma-2-2b-it-Q4_K_M.gguf',
        serverInstall: 'Server installation',
        serverVariant: 'Server version',
        os: 'OS',
        installServer: 'Install server',
        downloading: 'Downloading...',
        serverPort: 'Server port',
        temperatureLabel: 'temperature',
        temperatureHelp: 'Controls the randomness of the generated text. Higher = more random',
        topKLabel: 'top_k',
        topKHelp: 'Keeps only k top tokens',
        topPLabel: 'top_p',
        topPHelp: 'Limits tokens to a cumulative probability of at least p',
        minPLabel: 'min_p',
        minPHelp: 'Minimum probability relative to the most likely token',
        maxTokensLabel: 'max_tokens',
        maxTokensHelp: 'Maximum number of tokens per output (-1 = unlimited)',
        repeatLastNLabel: 'Last n tokens to consider for penalizing repetition',
        pasteToFileLengthLabel: 'Paste length to file',
        pasteToFileLengthHelp: 'On long paste, convert to a file (0 = disable)',
        parsePdfAsImageLabel: 'Parse PDF as image instead of text',
        provider: 'Provider',
        ollamaBaseUrl: 'Ollama Base URL',
        modelLabel: 'Model',
        customOption: 'Custom',
        refreshList: 'Refresh',
        loading: 'Loading…',
        contextFolder: 'Context folder',
        contextFolderHelp: 'Files from this folder will be added to every message',
        chooseFolder: 'Choose',
        clear: 'Clear'
      },
      projects: {
        title: 'Projects',
        nameLabel: 'Project name',
        saveCurrent: 'Save current configuration',
        empty: 'No projects yet. Create the first one to quickly switch between configurations.',
        mode: 'Mode',
        provider: 'Provider',
        server: 'Server',
        model: 'Model',
        active: 'Active',
        activate: 'Activate',
        open: 'Open',
        delete: 'Delete',
        deleteProject: 'Delete project',
        projectChip: 'Project',
        configsCount: 'Configs: {{count}}',
        unnamed: '(unnamed)',
        summaryPattern: 'Mode: {{mode}} • Provider: {{provider}} • Server: {{server}}',
        none: 'No project'
      },
      status: {
        inProgress: 'In progress',
        extracting: 'Extracting',
        done: 'Done',
        error: 'Error',
        waiting: 'Waiting',
        serverTitle: '',
        steps: {
          downloadBinaries: 'Downloading binaries',
          unpack: 'Unpacking',
          ready: 'Ready'
        }
      },
      errors: {
        serverNotRunning: 'Server is not running'
      },
      common: {
        expand: 'Expand',
        collapse: 'Collapse',
        showDetails: 'Show details',
        hideDetails: 'Hide details',
        loading: 'Loading…'
      },
      ctx: {
        title: 'Context',
        attach: 'Context',
        fromFiles: 'Insert files',
        fromFolderTree: 'Folder tree'
      },
      dev: {
        insertPrompt: 'Developer prompt'
      },
      monitor: {
        tooltip: 'RAM/CPU usage monitor'
      },
      meta: {
        model: 'Model',
        usage: {
          prompt_tokens: 'Prompt tokens',
          completion_tokens: 'Completion tokens',
          total_tokens: 'Total tokens'
        },
        timings: {
          prompt_ms: 'Prompt time, ms',
          predicted_ms: 'Generation time, ms',
          prompt_n: 'Prompt tokens count',
          predicted_n: 'Generated tokens'
        }
      }
    }
  }
};

const storedLng = (typeof localStorage !== 'undefined' && localStorage.getItem('i18n_lang')) || 'en';

await i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: storedLng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

i18n.on('languageChanged', (lng) => {
  try { localStorage.setItem('i18n_lang', lng); } catch {}
});

export default i18n;
