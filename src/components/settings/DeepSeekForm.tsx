import React, { useState } from 'react';
import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface DeepSeekFormProps {
  apiKey: string;
  setApiKey: (v: string) => void;
  deepseekUrl: string;
  setDeepseekUrl: (v: string) => void;
  deepseekModel: string;
  setDeepseekModel: (v: string) => void;
}

const deepseekOptions = ['deepseek-chat', 'deepseek-reasoner'] as const;

export const DeepSeekForm: React.FC<DeepSeekFormProps> = ({ apiKey, setApiKey, deepseekUrl, setDeepseekUrl, deepseekModel, setDeepseekModel }) => {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<'deepseek-chat' | 'deepseek-reasoner' | 'custom'>(
    (deepseekOptions as readonly string[]).includes(deepseekModel) ? (deepseekModel as any) : 'custom'
  );

  return (
    <>
      <TextField
        fullWidth
        label={t('settings.deepseekUrl') || ''}
        type="text"
        value={deepseekUrl}
        onChange={(e) => setDeepseekUrl(e.target.value)}
        placeholder="https://api.deepseek.com/chat/completions"
        size="small"
      />
      <FormControl fullWidth size="small">
        <InputLabel id="deepseek-model-label">{t('settings.apiModel')}</InputLabel>
        <Select
          labelId="deepseek-model-label"
          label={t('settings.apiModel') || ''}
          value={choice}
          onChange={(e) => {
            const val = e.target.value as typeof choice;
            setChoice(val);
            if (val !== 'custom') setDeepseekModel(val);
          }}
        >
          {deepseekOptions.map((m) => (
            <MenuItem key={m} value={m}>{m}</MenuItem>
          ))}
          <MenuItem value="custom">{t('settings.customModel')}</MenuItem>
        </Select>
      </FormControl>
      {choice === 'custom' && (
        <TextField
          fullWidth
          label={t('settings.customModel') || ''}
          type="text"
          value={deepseekModel}
          onChange={(e) => setDeepseekModel(e.target.value)}
          placeholder="deepseek-chat"
          size="small"
        />
      )}
      <TextField
        fullWidth
        label={t('settings.deepseekApiKey') || ''}
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={t('settings.apiKey') + ' (optional)' || ''}
        size="small"
      />
    </>
  );
};