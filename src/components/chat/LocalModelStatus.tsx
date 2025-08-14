import React, { useMemo, useState } from 'react';
import { Box, Chip, Collapse, IconButton, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { StatusCard, Step } from '../StatusCard';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../stores/chatStore';

interface LocalModelStatusProps {
  mode: 'deepseek' | 'openai' | 'local' | 'ollama';
  downloadStatus: { progress: number; status: 'idle' | 'downloading' | 'extracting' | 'completed' | 'error'; message: string; };
  isServerReady: boolean;
}

function statusLabel(status: LocalModelStatusProps['downloadStatus']['status'], t: any) {
  switch (status) {
    case 'downloading':
      return t('status.inProgress');
    case 'extracting':
      return t('status.extracting');
    case 'completed':
      return t('status.done');
    case 'error':
      return t('status.error');
    default:
      return t('status.waiting');
  }
}

function statusColor(status: LocalModelStatusProps['downloadStatus']['status']): any {
  switch (status) {
    case 'downloading':
      return 'info';
    case 'extracting':
      return 'warning';
    case 'completed':
      return 'success';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
}

export const LocalModelStatus: React.FC<LocalModelStatusProps> = ({ mode, downloadStatus, isServerReady }) => {
  const { t } = useTranslation();

  const modelSteps: Step[] = useMemo(() => {
    if (mode !== 'local') return [];
    const msg = (downloadStatus.message || '').toLowerCase();
    const downloading = downloadStatus.status === 'downloading' && msg.includes('скачив');
    const starting = msg.includes('запуск сервера');
    const done = (downloadStatus.status === 'completed') || isServerReady;
    return [
      { label: t('status.steps.downloadBinaries'), active: downloading && !done, done: downloadStatus.progress >= 100 || starting || done },
      { label: t('status.steps.unpack'), active: starting && !done, done: done },
      { label: t('status.steps.ready'), done: done, active: done }
    ];
  }, [mode, downloadStatus, isServerReady, t]);

  const shouldExpandByDefault = downloadStatus.status === 'downloading' || downloadStatus.status === 'extracting' || !isServerReady;
  const [expanded, setExpanded] = useState<boolean>(shouldExpandByDefault);
  const { serverVariant, modelRepo, ollamaModel } = useChatStore() as any;

  const shouldHide = ((mode !== 'local' && mode !== 'ollama')) || downloadStatus.status === 'idle';
  if (shouldHide) return null;

  const modeLabel = mode === 'ollama' ? 'Ollama' : t('settings.local');
  const provider = mode === 'ollama' ? 'Ollama' : 'llama.cpp';
  const version = serverVariant || '—';
  const repo = mode === 'ollama' ? (ollamaModel || '—') : (modelRepo || '—');

  return (
    <Box sx={{ mb: 2, ml:1, mr:1 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: expanded ? 1 : 0 }}>
        <Chip size="small" color={statusColor(downloadStatus.status)} label={statusLabel(downloadStatus.status, t)} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" color="text.secondary" noWrap>
            {`${modeLabel} - ${provider} - ${version}`}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
            {`${t('chat.repository')}: ${repo}`}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? t('common.collapse') : t('common.expand')}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Stack>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <StatusCard
          title={t('chat.localModel')}
          progress={downloadStatus.progress}
          message={downloadStatus.message}
          status={downloadStatus.status as any}
          steps={modelSteps}
        />
      </Collapse>
    </Box>
  );
};