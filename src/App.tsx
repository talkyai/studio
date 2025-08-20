import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Chat } from "./components/Chat";
import { Settings } from "./components/Settings";
import { PromptBuilder } from "./components/PromptBuilder";
import { useChatStore } from "./stores/chatStore.ts";
import {
    AppBar, Box, Container, IconButton, Menu, MenuItem, Tab, Tabs,
    Toolbar, Typography, Tooltip, styled
} from "@mui/material";
import {
    SmartToy, Settings as SettingsIcon, DarkMode, LightMode,
    Translate, PlayArrow, StopCircle, Widgets
} from "@mui/icons-material";
import { useColorMode } from "./ColorModeProvider";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import { ProjectsMenu } from "./components/ProjectsMenu";
import { LocalModelStatus } from "./components/chat/LocalModelStatus";
import { InputBar } from "./components/chat/InputBar";
import { SystemMonitor } from "./components/SystemMonitor";
import {AttachBar} from "./components/chat/AttachBar.tsx";
import { PluginToolbarButtons } from './components/plugins/PluginToolbarButtons';
import { PluginInputArea } from './components/plugins/PluginInputArea';
import { PluginAboveLocalModelStatus } from './components/plugins/PluginAboveLocalModelStatus';
import { usePlugins } from './hooks/usePlugins';
import { NotificationsHost } from './components/NotificationsHost';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    transition: 'all 0.3s ease',
    boxShadow: 'none',
}));

const AppContainer = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'background.default',
});

const MainContent = styled(Container)(({ theme }) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(3),
    minHeight: 0,
    [theme.breakpoints.down('sm')]: {
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
    },
}));

const ChatFooter = styled(Box)(({ theme }) => ({
    position: 'sticky',
    bottom: 0,
    zIndex: theme.zIndex.appBar,
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(1.5, 2),
    [theme.breakpoints.up('sm')]: {
        padding: theme.spacing(1.5, 3),
    },
}));

function a11yProps(index: number) {
    return {
        id: `main-tab-${index}`,
        'aria-controls': `main-tabpanel-${index}`,
    } as const;
}

function App() {
    const [activeTab, setActiveTab] = useState<'chat' | 'builder' | 'settings'>('chat');
    // Load plugins (frontend init and UI components)
    usePlugins();
    const {
        hasBinary,
        checkBinary,
        loadSettings,
        mode: chatMode,
        isServerReady,
        isStartingServer,
        startLocalServer,
        stopLlamaServer,
        projects,
        activeProjectId,
        sendMessage,
        downloadStatus,
        persistSettings,
    } = useChatStore();

    const { mode, toggle, setMode } = useColorMode();
    const { t } = useTranslation();
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
        const initializeSettings = async () => {
            try {
                const s: any = await (await import('@tauri-apps/api/core')).invoke('load_settings');
                if (s?.theme === 'dark') setMode('dark');
            } catch {}
            await loadSettings();
        };
        initializeSettings();
    }, []);

    useEffect(() => {
        checkBinary();
    }, [hasBinary, chatMode]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'F12') {
                try { invoke('open_devtools'); } catch {}
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const muiTabValue = activeTab === 'chat' ? 0 : (activeTab === 'builder' ? 1 : 2);

    const changeLang = async (lng: 'ru' | 'en') => {
        await i18n.changeLanguage(lng);
        setLangAnchor(null);
    };

    return (
        <AppContainer>
            <StyledAppBar position="sticky">
                <Toolbar sx={{ gap: 2, minHeight: { xs: 56, sm: 64 } }}>
                    {/* Server Control Group */}
                    {['local', 'ollama'].includes(chatMode) && (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {isServerReady ? (
                                    <Tooltip title={t('chat.stopServer')}>
                                        <IconButton
                                            color="warning"
                                            size="small"
                                            onClick={stopLlamaServer}
                                            aria-label={t('chat.stopServer')!}
                                        >
                                            <StopCircle fontSize="small"/>
                                        </IconButton>
                                    </Tooltip>
                                ) : (
                                    <Tooltip title={isStartingServer ? t('chat.serverStarting') : t('chat.startServer')}>
                                        <IconButton
                                            color="primary"
                                            size="small"
                                            onClick={startLocalServer}
                                            disabled={isStartingServer || !hasBinary}
                                            aria-label={t('chat.startServer')!}
                                        >
                                            <PlayArrow fontSize="small"/>
                                        </IconButton>
                                    </Tooltip>
                                )}
                                <SystemMonitor />
                            </Box>
                        </Box>
                    )}

                    {/* Main Tabs */}
                    <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
                        <Tabs
                            value={muiTabValue}
                            onChange={(_, val) => setActiveTab(val === 0 ? 'chat' : (val === 1 ? 'builder' : 'settings'))}
                            aria-label="main tabs"
                            sx={{ minHeight: { xs: 48, sm: 64 } }}
                        >
                            <Tab
                                icon={<SmartToy fontSize="small"/>}
                                iconPosition="start"
                                label={t('app.tabs.chat')}
                                {...a11yProps(0)}
                                sx={{ minHeight: { xs: 48, sm: 64 } }}
                            />
                            <Tab
                                icon={<Widgets fontSize="small"/>}
                                iconPosition="start"
                                label={t('app.tabs.builder')}
                                {...a11yProps(1)}
                                sx={{ minHeight: { xs: 48, sm: 64 } }}
                            />
                            <Tab
                                icon={<SettingsIcon fontSize="small"/>}
                                iconPosition="start"
                                label={t('app.tabs.settings')}
                                {...a11yProps(2)}
                                sx={{ minHeight: { xs: 48, sm: 64 } }}
                            />
                        </Tabs>
                    </Box>

                    {/* Utility Icons */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ProjectsMenu />

                        {/* Plugin toolbar buttons */}
                        <PluginToolbarButtons />

                        <Tooltip title={t('app.toggleTheme')}>
                            <IconButton
                                color="inherit"
                                size="small"
                                onClick={() => { try { toggle(); } finally { try { persistSettings(); } catch {} } }}
                                aria-label={t('app.toggleTheme')!}
                            >
                                {mode === 'light' ? <DarkMode fontSize="small"/> : <LightMode fontSize="small"/>}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={t('app.language')}>
                            <IconButton
                                color="inherit"
                                size="small"
                                onClick={(e) => setLangAnchor(e.currentTarget)}
                                aria-label={t('app.language')!}
                            >
                                <Translate fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Language Menu */}
                    <Menu
                        anchorEl={langAnchor}
                        open={Boolean(langAnchor)}
                        onClose={() => setLangAnchor(null)}
                        slotProps={{
                            paper: {
                                sx: {
                                    mt: 1.5,
                                    minWidth: 120,
                                }
                            }
                        }}
                    >
                        <MenuItem
                            onClick={() => changeLang('ru')}
                            selected={i18n.language === 'ru'}
                        >
                            Русский
                        </MenuItem>
                        <MenuItem
                            onClick={() => changeLang('en')}
                            selected={i18n.language === 'en'}
                        >
                            English
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </StyledAppBar>

            <MainContent maxWidth={false} disableGutters>
                {activeTab === 'chat' ? (
                    <>
                        <PluginAboveLocalModelStatus />
                        <LocalModelStatus
                            mode={chatMode}
                            downloadStatus={downloadStatus as any}
                            isServerReady={isServerReady}
                        />
                        <Chat setActiveTab={setActiveTab}/>
                    </>
                ) : activeTab === 'builder' ? (
                    <PromptBuilder setActiveTab={setActiveTab} />
                ) : (
                    <Settings setActiveTab={setActiveTab}/>
                )}
            </MainContent>

            {activeTab === 'chat' && (
                <ChatFooter>
                    <PluginInputArea />
                    <AttachBar onInsert={(text) => setChatInput((prev) => (prev ? prev + '\n' : '') + text)} />
                    <InputBar
                        input={chatInput}
                        setInput={setChatInput}
                        onSend={handleSend}
                        disabled={(chatMode === 'local' || chatMode === 'ollama') && !isServerReady}
                        placeholder={(chatMode === 'local' || chatMode === 'ollama') && !isServerReady ?
                            t('chat.startingServer')! : t('chat.sendingPlaceholder')!}
                        sendLabel={t('chat.send')!}
                    />
                </ChatFooter>
            )}
            <NotificationsHost />
        </AppContainer>
    );
}

export default App;