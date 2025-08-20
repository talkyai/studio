import { useChatStore } from "../stores/chatStore";
import { useState } from 'react';
import {
    Card,
    CardContent,
    Stack,
    Button,
    TextField,
    Tabs,
    Tab,
    Box,
    Typography
} from "@mui/material";
import { useTranslation } from 'react-i18next';
import { ModeSelect } from './settings/ModeSelect';
import { DeepSeekForm } from './settings/DeepSeekForm';
import { OpenAIForm } from './settings/OpenAIForm';
import { LocalModelForm } from './settings/LocalModelForm';
import { ServerInstallCard } from './settings/ServerInstallCard';
import { ProjectsManager } from './settings/ProjectsManager';
import { OllamaForm } from './settings/OllamaForm';
import { PluginsManager } from './settings/PluginsManager';
import { PluginSettingsPanel } from './plugins/PluginSettingsPanel';

interface SettingsProps {
    setActiveTab: (tab: 'chat' | 'builder' | 'settings') => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `settings-tab-${index}`,
        'aria-controls': `settings-tabpanel-${index}`,
    };
}

export function Settings({ setActiveTab }: SettingsProps) {
    const {
        // API provider settings
        apiKey, setApiKey,
        apiBase, setApiBase,
        apiModel, setApiModel,
        deepseekUrl, setDeepseekUrl,
        deepseekModel, setDeepseekModel,
        ollamaBase, setOllamaBase,
        ollamaModel, setOllamaModel,

        // Local settings
        modelRepo, setModelRepo,
        serverPort, setServerPort,
        // Generation controls
        temperature, setTemperature,
        topK, setTopK,
        topP, setTopP,
        minP, setMinP,
        maxTokens, setMaxTokens,
        repeatLastN, setRepeatLastN,
        pasteToFileLength, setPasteToFileLength,
        parsePdfAsImage, setParsePdfAsImage,
        contextFolder, setContextFolder,

        // Mode & actions
        mode, setMode,
        checkBinary,
        downloadBinary,
        binaryDownloadStatus,
        serverVariant,
        setServerVariant,
        serverOS,
        setServerOS,
        hasBinary,
        startLocalServer,
        isServerReady,
        isStartingServer
    } = useChatStore();

    const [isDownloading, setIsDownloading] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const { t } = useTranslation();

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleDownload = async (server: 'llama-cpp' | 'ollama' = 'llama-cpp') => {
        try {
            setIsDownloading(true);
            await downloadBinary(serverVariant, server);
            await checkBinary();
        } catch (error) {
            console.error('Download error:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{  borderColor: 'divider' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    aria-label="Settings tabs"
                >
                    <Tab
                        label={<Typography variant="subtitle2">{t('settings.tabs.settings') || 'Настройки'}</Typography>}
                        {...a11yProps(0)}
                    />
                    <Tab
                        label={<Typography variant="subtitle2">{t('settings.tabs.projects') || 'Проекты'}</Typography>}
                        {...a11yProps(1)}
                    />
                    <Tab
                        label={<Typography variant="subtitle2">{t('settings.tabs.plugins') || 'Плагины'}</Typography>}
                        {...a11yProps(2)}
                    />
                </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
                <Stack spacing={3}>

                    <Card variant="outlined">
                        <CardContent>
                            <Stack spacing={2}>
                                <ModeSelect mode={mode} setMode={(m) => setMode(m)} />

                                {/* Context folder (auto-attach) */}
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                    <TextField
                                        fullWidth
                                        label={t('settings.contextFolder') || 'Папка контекста'}
                                        value={contextFolder}
                                        onChange={(e) => setContextFolder(e.target.value)}
                                        placeholder={t('settings.contextFolderHelp') || 'Файлы из этой папки будут добавляться к каждому сообщению'}
                                        size="small"
                                    />
                                    <Button
                                        variant="outlined"
                                        onClick={async () => {
                                            try {
                                                const { open } = await import('@tauri-apps/plugin-dialog');
                                                const res = await open({ directory: true, multiple: false });
                                                if (typeof res === 'string') setContextFolder(res);
                                                // if array (multiple), pick first
                                                if (Array.isArray(res) && res.length > 0 && typeof res[0] === 'string') setContextFolder(String(res[0]));
                                            } catch (e) {
                                                console.warn('choose folder failed', e);
                                            }
                                        }}
                                    >{t('settings.chooseFolder') || 'Выбрать папку'}</Button>
                                    <Button
                                        onClick={() => setContextFolder('')}
                                    >{t('settings.clear') || 'Очистить'}</Button>
                                </Stack>

                                {mode === 'deepseek' && (
                                    <DeepSeekForm
                                        apiKey={apiKey}
                                        setApiKey={setApiKey}
                                        deepseekUrl={deepseekUrl}
                                        setDeepseekUrl={setDeepseekUrl}
                                        deepseekModel={deepseekModel}
                                        setDeepseekModel={setDeepseekModel}
                                    />
                                )}

                                {mode === 'openai' && (
                                    <OpenAIForm
                                        apiBase={apiBase}
                                        setApiBase={setApiBase}
                                        apiModel={apiModel}
                                        setApiModel={setApiModel}
                                        apiKey={apiKey}
                                        setApiKey={setApiKey}
                                    />
                                )}

                                {mode === 'ollama' && (
                                    <>
                                        <OllamaForm
                                            base={ollamaBase}
                                            setBase={setOllamaBase}
                                            model={ollamaModel}
                                            setModel={setOllamaModel}
                                            onNavigateToChat={() => setActiveTab('chat')}
                                        />
                                        <ServerInstallCard
                                            binaryVariant={serverVariant}
                                            setBinaryVariant={(v: string) => { setServerVariant(v); checkBinary(); }}
                                            serverOS={serverOS}
                                            setServerOS={(os) => { setServerOS(os); }}
                                            isDownloading={isDownloading}
                                            onDownload={() => handleDownload('ollama')}
                                            binaryDownloadStatus={binaryDownloadStatus as any}
                                        />
                                    </>
                                )}

                                {mode === 'local' && (
                                    <>
                                        <LocalModelForm
                                            modelRepo={modelRepo}
                                            setModelRepo={setModelRepo}
                                            serverPort={serverPort}
                                            setServerPort={setServerPort}
                                            temperature={temperature}
                                            setTemperature={setTemperature}
                                            topK={topK}
                                            setTopK={setTopK}
                                            topP={topP}
                                            setTopP={setTopP}
                                            minP={minP}
                                            setMinP={setMinP}
                                            maxTokens={maxTokens}
                                            setMaxTokens={setMaxTokens}
                                            repeatLastN={repeatLastN}
                                            setRepeatLastN={setRepeatLastN}
                                            pasteToFileLength={pasteToFileLength}
                                            setPasteToFileLength={setPasteToFileLength}
                                            parsePdfAsImage={parsePdfAsImage}
                                            setParsePdfAsImage={setParsePdfAsImage}
                                        />
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                            {!isServerReady ? (
                                                <Button
                                                    onClick={async () => {
                                                        try {
                                                            setActiveTab('chat');
                                                            await startLocalServer();
                                                        } catch (e) {
                                                            console.warn('start llama.cpp failed', e);
                                                        }
                                                    }}
                                                    disabled={!hasBinary || isStartingServer}
                                                >{isStartingServer ? t('chat.serverStarting') : t('chat.startServer')}</Button>
                                            ) : (
                                                <Button
                                                    color="warning"
                                                    onClick={async () => {
                                                        try {
                                                            await useChatStore.getState().stopLlamaServer();
                                                        } catch (e) {
                                                            console.warn('stop llama.cpp failed', e);
                                                        }
                                                    }}
                                                >{t('chat.stopServer')}</Button>
                                            )}
                                        </Stack>
                                        <ServerInstallCard
                                            binaryVariant={serverVariant}
                                            setBinaryVariant={(v: string) => { setServerVariant(v); checkBinary(); }}
                                            serverOS={serverOS}
                                            setServerOS={(os) => { setServerOS(os); }}
                                            isDownloading={isDownloading}
                                            onDownload={handleDownload}
                                            binaryDownloadStatus={binaryDownloadStatus as any}
                                        />
                                    </>
                                )}
                                <PluginSettingsPanel />
                            </Stack>

                        </CardContent>
                    </Card>
                </Stack>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                <ProjectsManager />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
                <PluginsManager />
            </TabPanel>
        </Box>
    );
}