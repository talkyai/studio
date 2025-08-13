import React, { useEffect, useMemo, useState } from 'react';
import { Button, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { useChatStore } from '../../stores/chatStore';
import { useTranslation } from 'react-i18next';

function AdvancedParamsEditor() {
  const { ollamaParamsJson, setOllamaParamsJson } = useChatStore();
  const [val, setVal] = useState<string>(ollamaParamsJson || '');
  const isValid = useMemo(() => {
    const t = (val || '').trim();
    if (!t) return true;
    try { JSON.parse(t); return true; } catch { return false; }
  }, [val]);
  useEffect(() => { setVal(ollamaParamsJson || ''); }, [ollamaParamsJson]);
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">Доп. параметры Ollama (/api/chat) в формате JSON</Typography>
      <TextField
        multiline minRows={3}
        fullWidth
        size="small"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => setOllamaParamsJson(val)}
        placeholder='{"stream": false, "keep_alive": "5m", "options": {"seed": 42}}'
        error={!isValid}
        helperText={isValid ? 'Оставьте пустым, если не нужно. Будет объединено с телом запроса.' : 'Некорректный JSON'}
      />
    </Stack>
  );
}

interface OllamaFormProps {
  base: string;
  setBase: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  onNavigateToChat?: () => void;
  isDownloading?: boolean;
}

export const OllamaForm: React.FC<OllamaFormProps> = ({ base, setBase, model, setModel, onNavigateToChat, isDownloading }) => {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [choice, setChoice] = useState<string>('custom');
  const { startLocalServer, hasBinary, isStartingServer } = useChatStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (model && models.includes(model)) setChoice(model);
    else setChoice('custom');
  }, [model, models]);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const list = await invoke<string[]>('list_ollama_models', { baseUrl: base });
      setModels(list);
    } catch (e) {
      console.warn('list_ollama_models failed', e);
    } finally { setLoading(false); }
  };

  return (
    <Stack spacing={1}>
      <TextField
        fullWidth
        label={t('settings.ollamaBaseUrl') || ''}
        size="small"
        value={base}
        onChange={(e) => setBase(e.target.value)}
        placeholder="http://127.0.0.1:11434"
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <FormControl fullWidth size="small">
          <InputLabel id="ollama-model-label">{t('settings.modelLabel')}</InputLabel>
          <Select
            labelId="ollama-model-label"
            label={t('settings.modelLabel') || ''}
            value={choice}
            onChange={(e) => {
              const val = e.target.value as string;
              setChoice(val);
              if (val !== 'custom') setModel(val);
            }}
          >
            {models.map((m) => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
            <MenuItem value="custom">{t('settings.customOption')}</MenuItem>
          </Select>
        </FormControl>
        <Button onClick={fetchModels} disabled={loading}>{loading ? (t('settings.loading') || '') : (t('settings.refreshList') || '')}</Button>
      </Stack>

      {choice === 'custom' && (
        <TextField
          fullWidth
          label={t('settings.customModel') || ''}
          size="small"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="llama3"
        />
      )}

      {/* Advanced params JSON for Ollama /api/chat */}
      <AdvancedParamsEditor />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="contained"
          onClick={async () => {
            try {
              onNavigateToChat?.();
              await startLocalServer();
            } catch (e) {
              console.warn('start ollama failed', e);
            } finally {
              try { onNavigateToChat?.(); } catch {}
            }
          }}
          disabled={isDownloading || !hasBinary || isStartingServer}
        >{isStartingServer ? t('chat.serverStarting') : t('chat.startServer')}</Button>
      </Stack>
    </Stack>
  );
};
