import React, { useState } from 'react';
import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface OpenAIFormProps {
  apiBase: string;
  setApiBase: (v: string) => void;
  apiModel: string;
  setApiModel: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
}

const openaiOptions = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini'] as const;

export const OpenAIForm: React.FC<OpenAIFormProps> = ({ apiBase, setApiBase, apiModel, setApiModel, apiKey, setApiKey }) => {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<'gpt-4o' | 'gpt-4o-mini' | 'gpt-4.1' | 'gpt-4.1-mini' | 'custom'>(
    (openaiOptions as readonly string[]).includes(apiModel) ? (apiModel as any) : 'custom'
  );

  return (
    <>
      <TextField
        fullWidth
        label={t('settings.apiBaseUrl') || ''}
        type="text"
        value={apiBase}
        onChange={(e) => setApiBase(e.target.value)}
        placeholder="https://api.openai.com/v1"
        size="small"
      />
      <FormControl fullWidth size="small">
        <InputLabel id="openai-model-label">{t('settings.apiModel')}</InputLabel>
        <Select
          labelId="openai-model-label"
          label={t('settings.apiModel') || ''}
          value={choice}
          onChange={(e) => {
            const val = e.target.value as typeof choice;
            setChoice(val);
            if (val !== 'custom') setApiModel(val);
          }}
        >
          {openaiOptions.map((m) => (
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
          value={apiModel}
          onChange={(e) => setApiModel(e.target.value)}
          placeholder="gpt-4o-mini"
          size="small"
        />
      )}
      <TextField
        fullWidth
        label={t('settings.apiKey') || ''}
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={t('settings.apiKey') + ' (optional)' || ''}
        size="small"
      />
    </>
  );
};