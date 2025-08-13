import React from 'react';
import { Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface LocalModelFormProps {
  modelRepo: string;
  setModelRepo: (v: string) => void;
  serverPort: number;
  setServerPort: (v: number) => void;
  // Generation controls
  temperature: number;
  setTemperature: (v: number) => void;
  topK: number;
  setTopK: (v: number) => void;
  topP: number;
  setTopP: (v: number) => void;
  minP: number;
  setMinP: (v: number) => void;
  maxTokens: number;
  setMaxTokens: (v: number) => void;
  repeatLastN: number;
  setRepeatLastN: (v: number) => void;
  pasteToFileLength: number;
  setPasteToFileLength: (v: number) => void;
  parsePdfAsImage: boolean;
  setParsePdfAsImage: (v: boolean) => void;
}

export const LocalModelForm: React.FC<LocalModelFormProps> = ({
  modelRepo, setModelRepo,
  serverPort, setServerPort,
  temperature, setTemperature,
  topK, setTopK,
  topP, setTopP,
  minP, setMinP,
  maxTokens, setMaxTokens,
  repeatLastN, setRepeatLastN,
  pasteToFileLength, setPasteToFileLength,
  parsePdfAsImage, setParsePdfAsImage,
}) => {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <TextField
        fullWidth
        label={t('settings.repoLabel') || ''}
        type="text"
        value={modelRepo}
        onChange={(e) => setModelRepo(e.target.value)}
        placeholder={t('settings.repoPlaceholder') || ''}
        size="small"
      />
      <TextField
        fullWidth
        label={t('settings.serverPort') || ''}
        type="number"
        value={serverPort}
        onChange={(e) => setServerPort(parseInt(e.target.value || '8080', 10))}
        placeholder="8080"
        size="small"
      />

      <TextField fullWidth label={t('settings.temperatureLabel') || ''} helperText={t('settings.temperatureHelp') || ''} type="number" size="small" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value || '0'))} />
      <TextField fullWidth label={t('settings.topKLabel') || ''} helperText={t('settings.topKHelp') || ''} type="number" size="small" value={topK} onChange={(e) => setTopK(parseInt(e.target.value || '0', 10))} />
      <TextField fullWidth label={t('settings.topPLabel') || ''} helperText={t('settings.topPHelp') || ''} type="number" size="small" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value || '0'))} />
      <TextField fullWidth label={t('settings.minPLabel') || ''} helperText={t('settings.minPHelp') || ''} type="number" size="small" value={minP} onChange={(e) => setMinP(parseFloat(e.target.value || '0'))} />
      <TextField fullWidth label={t('settings.maxTokensLabel') || ''} helperText={t('settings.maxTokensHelp') || ''} type="number" size="small" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value || '0', 10))} />
      <TextField fullWidth label={t('settings.repeatLastNLabel') || ''} type="number" size="small" value={repeatLastN} onChange={(e) => setRepeatLastN(parseInt(e.target.value || '0', 10))} />
      <TextField fullWidth label={t('settings.pasteToFileLengthLabel') || ''} helperText={t('settings.pasteToFileLengthHelp') || ''} type="number" size="small" value={pasteToFileLength} onChange={(e) => setPasteToFileLength(parseInt(e.target.value || '0', 10))} />
      <FormControlLabel control={<Checkbox checked={parsePdfAsImage} onChange={(e) => setParsePdfAsImage(e.target.checked)} />} label={t('settings.parsePdfAsImageLabel') || ''} />
    </Stack>
  );
};