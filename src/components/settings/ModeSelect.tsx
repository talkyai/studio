import React, { useMemo } from 'react';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ModeSelectProps {
  mode: 'deepseek' | 'openai' | 'local' | 'ollama';
  setMode: (m: 'deepseek' | 'openai' | 'local' | 'ollama') => void;
}

const apiProviders = [
  { value: 'deepseek', labelKey: 'settings.deepseek' },
  { value: 'openai', labelKey: 'settings.openai' },
] as const;

const localProviders = [
  { value: 'local', label: 'llama.cpp' },
  { value: 'ollama', label: 'Ollama' },
] as const;

export const ModeSelect: React.FC<ModeSelectProps> = ({ mode, setMode }) => {
  const { t } = useTranslation();

  const category: 'api' | 'local' = useMemo(() => {
    return (mode === 'deepseek' || mode === 'openai') ? 'api' : 'local';
  }, [mode]);

  const handleCategoryChange = (val: 'api' | 'local') => {
    // Switch provider to the first available for that category
    if (val === 'api') setMode('deepseek'); else setMode('local');
  };

  const providers = category === 'api' ? apiProviders : localProviders;

  return (
    <Stack spacing={1} direction={{ xs: 'column', sm: 'row' }}>
      <FormControl fullWidth size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="mode-cat-label">{t('settings.workMode')}</InputLabel>
        <Select
          labelId="mode-cat-label"
          label={t('settings.workMode') || ''}
          value={category}
          onChange={(e: SelectChangeEvent<'api' | 'local'>) => handleCategoryChange(e.target.value as any)}
        >
          <MenuItem value="api">API</MenuItem>
          <MenuItem value="local">{t('settings.local')}</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="provider-label">{t('settings.provider')}</InputLabel>
        <Select
          labelId="provider-label"
          label={t('settings.provider') || ''}
          value={mode}
          onChange={(e: SelectChangeEvent<'deepseek' | 'openai' | 'local' | 'ollama'>) => setMode(e.target.value as any)}
        >
          {providers.map(p => (
            <MenuItem key={p.value} value={p.value as any}>
              {'labelKey' in p ? t(p.labelKey as any) : p.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
};