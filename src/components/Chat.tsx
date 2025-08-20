import { useChatStore } from '../stores/chatStore';
import { Alert, Box, Button, Paper } from "@mui/material";
import { useTranslation } from 'react-i18next';
import { MessagesList } from './chat/MessagesList';

interface ChatProps {
    setActiveTab: (tab: 'chat' | 'builder' | 'settings') => void;
}

export function Chat({ setActiveTab }: ChatProps) {
    const {
        messages,
        mode,
        hasBinary,
    } = useChatStore();
    const { t } = useTranslation();

    if ((mode === 'local' || mode === 'ollama') && !hasBinary) {
        return (
            <Paper sx={{ p: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                    {t('chat.needServer')}
                </Alert>
                <Button variant="contained" onClick={() => setActiveTab('settings')}>{t('chat.goSettings')}</Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 2.5, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 1.5, pb: 6, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <MessagesList messages={messages as any} />
            </Box>
        </Paper>
    );
}