import {useEffect, useState} from "react";
import {Chat} from "./components/Chat";
import {Settings} from "./components/Settings";
import "./App.css";
import {useChatStore} from "./stores/chatStore.ts";
import {
    AppBar,
    Box,
    Container,
    IconButton,
    Menu,
    MenuItem,
    Tab,
    Tabs,
    Toolbar,
    Typography,
    Tooltip
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SettingsIcon from "@mui/icons-material/Settings";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import TranslateIcon from "@mui/icons-material/Translate";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import {useColorMode} from "./ColorModeProvider";
import {useTranslation} from "react-i18next";
import i18n from "./i18n";
import {ProjectsMenu} from "./components/ProjectsMenu";
import {LocalModelStatus} from "./components/chat/LocalModelStatus";
import {InputBar} from "./components/chat/InputBar";
import {AttachBar} from "./components/chat/AttachBar";
import {SystemMonitor} from "./components/SystemMonitor";

function a11yProps(index: number) {
    return {
        id: `main-tab-${index}`,
        'aria-controls': `main-tabpanel-${index}`,
    } as const;
}

function App() {
    const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');
    const {
        hasBinary,
        checkBinary,
        loadSettings,
        apiKey,
        apiBase,
        apiModel,
        deepseekUrl,
        deepseekModel,
        modelRepo,
        mode: chatMode,
        isServerReady,
        isStartingServer,
        startLocalServer,
        stopLlamaServer,
        projects,
        activeProjectId,
        sendMessage,
        downloadStatus,
    } = useChatStore();
    const {mode, toggle, setMode} = useColorMode();
    const {t} = useTranslation();

    const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);
    const [chatInput, setChatInput] = useState('');

    const handleSend = async () => {
        try {
            const text = chatInput.trim();
            if (!text) return;
            if ((chatMode === 'local' || chatMode === 'ollama') && !isServerReady) {
                return;
            }
            await sendMessage(text);
            setChatInput('');
        } catch (e) {
            console.warn('sendMessage failed', e);
        }
    };

    useEffect(() => {
        // Hydrate settings from DB and set theme
        (async () => {
            try {
                const s: any = await (await import('@tauri-apps/api/core')).invoke('load_settings');
                if (s && s.theme === 'dark') setMode('dark');
            } catch {
            }
            await loadSettings();
        })();
    }, []);

    useEffect(() => {
        checkBinary();
    }, [hasBinary, chatMode]);

    const muiTabValue = activeTab === 'chat' ? 0 : 1;

    const changeLang = async (lng: 'ru' | 'en') => {
        await i18n.changeLanguage(lng);
        setLangAnchor(null);
    };

    // Persist theme + settings when theme changes via toggle
    useEffect(() => {
        (async () => {
            try {
                await (await import('@tauri-apps/api/core')).invoke('save_settings', {
                    settings: {
                        mode: chatMode,
                        api_key: apiKey,
                        api_base: apiBase,
                        api_model: apiModel,
                        deepseek_url: deepseekUrl,
                        deepseek_model: deepseekModel,
                        model_repo: modelRepo,
                        theme: mode,
                    }
                });
            } catch (e) {
                console.warn('persist theme failed', e);
            }
        })();
    }, [mode, chatMode, apiKey, apiBase, apiModel, deepseekUrl, deepseekModel, modelRepo]);

    return (
        <Box sx={{minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column'}}>
            <AppBar position="sticky" color="inherit" elevation={0} sx={{
                borderBottom: 1,
                borderColor: 'divider',
                transition: 'background-color 0.3s ease, border-color 0.3s ease'
            }}>
                <Toolbar sx={{
                    gap: 2,
                    minHeight: {xs: 56, sm: 64},
                    alignItems: 'center'
                }}>
                    {/* Группа элементов управления сервером - ПЕРЕНЕСЕНА СЮДА */}
                    {['local', 'ollama'].includes(chatMode) && (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column', // Изменено на вертикальное расположение
                            gap: 0.5,
                            mr: 'auto'
                        }}>
                            <Typography
                                variant="caption"
                                noWrap
                                sx={{
                                    ml: 1,
                                    color: 'text.primary',
                                    fontWeight: 700,
                                    width: 'fit-content'
                                }}
                            >
                                 {projects.find(p => p.id === (activeProjectId ?? -1))?.name || t('app.noProject')}
                            </Typography>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                width: 'fit-content'
                            }}>
                                {isServerReady ? (
                                    <Tooltip title={t('chat.stopServer')}>
                                        <IconButton
                                            color="warning"
                                            size="small"
                                            onClick={() => stopLlamaServer()}
                                            aria-label={t('chat.stopServer')!}
                                            sx={{p: 0.75}}
                                        >
                                            <StopCircleIcon fontSize="small"/>
                                        </IconButton>
                                    </Tooltip>
                                ) : (
                                    <Tooltip
                                        title={isStartingServer ? t('chat.serverStarting') : t('chat.startServer')}>
                                      <span>
                                        <IconButton
                                            color="primary"
                                            size="small"
                                            onClick={() => startLocalServer()}
                                            disabled={isStartingServer || !hasBinary}
                                            aria-label={t('chat.startServer')!}
                                            sx={{p: 0.75}}
                                        >
                                          <PlayArrowIcon fontSize="small"/>
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                )}
                                <SystemMonitor />
                            </Box>


                        </Box>
                    )}

                    <Box sx={{
                        display: 'flex',
                        flexGrow: 1,
                        justifyContent: 'flex-end',
                        marginLeft: 'auto'
                    }}>
                        <Tabs
                            value={muiTabValue}
                            onChange={(_, val) => setActiveTab(val === 0 ? 'chat' : 'settings')}
                            aria-label="main-tabs"
                            textColor="primary"
                            indicatorColor="primary"
                            sx={{
                                minHeight: {xs: 48, sm: 64}
                            }}
                        >
                            <Tab
                                icon={<SmartToyIcon fontSize="small"/>}
                                iconPosition="start"
                                label={t('app.tabs.chat')}
                                {...a11yProps(0)}
                                sx={{minHeight: {xs: 48, sm: 64}, py: 0}}
                            />
                            <Tab
                                icon={<SettingsIcon fontSize="small"/>}
                                iconPosition="start"
                                label={t('app.tabs.settings')}
                                {...a11yProps(1)}
                                sx={{minHeight: {xs: 48, sm: 64}, py: 0}}
                            />
                        </Tabs>
                    </Box>

                    {/* Группа утилит (тема, язык, проекты) */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        ml: {xs: 0, sm: 1}
                    }}>
                        <ProjectsMenu/>

                        <Tooltip title={t('app.toggleTheme')}>
                            <IconButton
                                color="inherit"
                                size="small"
                                onClick={() => toggle()}
                                aria-label={t('app.toggleTheme')!}
                                sx={{p: 0.75}}
                            >
                                {mode === 'light' ? (
                                    <DarkModeIcon fontSize="small"/>
                                ) : (
                                    <LightModeIcon fontSize="small"/>
                                )}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={t('app.language')}>
                            <IconButton
                                color="inherit"
                                size="small"
                                onClick={(e) => setLangAnchor(e.currentTarget)}
                                aria-label={t('app.language')!}
                                sx={{p: 0.75}}
                            >
                                <TranslateIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Меню выбора языка */}
                    <Menu
                        anchorEl={langAnchor}
                        open={Boolean(langAnchor)}
                        onClose={() => setLangAnchor(null)}
                        slotProps={{
                            paper: {
                                sx: {
                                    mt: 1.5,
                                    minWidth: 120
                                }
                            }
                        }}
                    >
                        <MenuItem
                            onClick={() => changeLang('ru')}
                            selected={i18n.language === 'ru'}
                            sx={{typography: 'body2'}}
                        >
                            Русский
                        </MenuItem>
                        <MenuItem
                            onClick={() => changeLang('en')}
                            selected={i18n.language === 'en'}
                            sx={{typography: 'body2'}}
                        >
                            English
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>

            <Container maxWidth={false} disableGutters sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                px: {xs: 2, sm: 3},
                pt: 3,
                pb: activeTab === 'chat' ? {xs: 14, sm: 16} : 3
            }}>
                {activeTab === 'chat' ? (
                    <>
                        <LocalModelStatus mode={chatMode} downloadStatus={downloadStatus as any}
                                          isServerReady={isServerReady}/>
                        <Chat setActiveTab={setActiveTab}/>
                    </>
                ) : (
                    <Settings setActiveTab={setActiveTab}/>
                )}
            </Container>
            {activeTab === 'chat' && (
                <Box sx={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: (theme) => theme.zIndex.appBar,
                    borderTop: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    px: {xs: 2, sm: 3},
                    py: 1.5
                }}>
                    <AttachBar onInsert={(text) => setChatInput((prev) => (prev ? prev + '\n\n' : '') + text)}/>
                    <InputBar
                        input={chatInput}
                        setInput={setChatInput}
                        onSend={handleSend}
                        disabled={(chatMode === 'local' || chatMode === 'ollama') && !isServerReady}
                        placeholder={(chatMode === 'local' || chatMode === 'ollama') && !isServerReady ? t('chat.startingServer')! : t('chat.sendingPlaceholder')!}
                        sendLabel={t('chat.send')!}
                    />
                </Box>
            )}
        </Box>
    );
}

export default App;