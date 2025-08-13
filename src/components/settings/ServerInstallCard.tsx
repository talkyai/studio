import React from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { StatusCard } from '../StatusCard';
import { useTranslation } from 'react-i18next';

interface ServerInstallCardProps {
  binaryVariant: string;
  setBinaryVariant: (v: string) => void;
  serverOS: 'windows' | 'macos' | 'linux';
  setServerOS: (os: 'windows' | 'macos' | 'linux') => void;
  isDownloading: boolean;
  onDownload: () => Promise<void>;
  onStart?: () => Promise<void>;
  binaryDownloadStatus: { progress: number; status: 'idle' | 'downloading' | 'completed' | 'error'; message: string };
}

function deriveBinaryStatus(progress: number, _message: string, status: 'idle' | 'downloading' | 'extracting' | 'completed' | 'error') {
  if (status === 'error') return 'error' as const;
  if (status === 'extracting') return 'extracting' as const;
  if (status === 'completed' || progress >= 100) return 'completed' as const;
  if (status === 'downloading') return 'downloading' as const;
  return 'idle' as const;
}

function deriveBinarySteps(progress: number, _message: string, status: 'idle' | 'downloading' | 'extracting' | 'completed' | 'error', t: any) {
  const isExtract = status === 'extracting';
  const isDone = status === 'completed' || progress >= 100;
  return [
    { label: t('status.steps.downloadBinaries'), done: progress >= 1 && progress < 50 ? false : progress >= 50, active: status === 'downloading' && progress < 100 },
    { label: t('status.steps.unpack'), done: isDone, active: isExtract && !isDone },
    { label: t('status.steps.ready'), done: isDone, active: isDone }
  ];
}

export const ServerInstallCard: React.FC<ServerInstallCardProps> = ({ binaryVariant, setBinaryVariant, serverOS, setServerOS, isDownloading, onDownload, onStart, binaryDownloadStatus }) => {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>{t('settings.serverInstall')}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="server-os-label">{t('settings.os') || 'ОС'}</InputLabel>
          <Select
            labelId="server-os-label"
            label={t('settings.os') || 'ОС'}
            value={serverOS}
            onChange={(e) => setServerOS(e.target.value as any)}
            disabled={isDownloading}
          >
            <MenuItem value="windows">Windows</MenuItem>
            <MenuItem value="macos">macOS</MenuItem>
            <MenuItem value="linux">Linux</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel id="binary-variant-label">{t('settings.serverVariant')}</InputLabel>
          <Select
            labelId="binary-variant-label"
            label={t('settings.serverVariant') || ''}
            value={binaryVariant}
            onChange={(e) => setBinaryVariant(e.target.value)}
            disabled={isDownloading}
          >
            <MenuItem value="cpu">CPU only (AVX2)</MenuItem>
            <MenuItem value="cpu_arm">CPU only (ARM)</MenuItem>
            <MenuItem value="cuda_12">NVIDIA GPU (CUDA 12.x)</MenuItem>
            <MenuItem value="hip_radeon">RADEON GPU (HIP)</MenuItem>
            <MenuItem value="vulkan">Vulkan GPU</MenuItem>
          </Select>
        </FormControl>

        <Button onClick={() => onDownload()} disabled={isDownloading}>
          {isDownloading ? t('settings.downloading') : t('settings.installServer')}
        </Button>
        {onStart && (
          <Button onClick={() => onStart()} disabled={isDownloading}>
            {t('chat.startServer')}
          </Button>
        )}
      </Stack>

      {binaryDownloadStatus.status !== 'idle' && (
        <Box sx={{ mt: 2 }}>
          <StatusCard
            title={t('status.serverTitle')}
            progress={binaryDownloadStatus.progress}
            message={binaryDownloadStatus.message}
            status={deriveBinaryStatus(binaryDownloadStatus.progress, binaryDownloadStatus.message, binaryDownloadStatus.status) as any}
            steps={deriveBinarySteps(binaryDownloadStatus.progress, binaryDownloadStatus.message, binaryDownloadStatus.status, t)}
          />
        </Box>
      )}
    </Box>
  );
};