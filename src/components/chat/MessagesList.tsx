import { Box, Collapse, IconButton, List, ListItem, Paper, Stack, Typography } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import React, { useEffect, useRef, useState } from "react";
import { Message } from "../../stores/types";
import { useTranslation } from 'react-i18next';

interface MessagesListProps {
  messages: Message[];
}

function metaEntries(meta: any): { label: string; value: string | number }[] {
  const entries: { label: string; value: string | number }[] = [];
  if (!meta) return entries;
  if (meta.model) entries.push({ label: 'model', value: String(meta.model) });
  if (meta.usage) {
    const u = meta.usage;
    if (typeof u.prompt_tokens === 'number') entries.push({ label: 'usage.prompt_tokens', value: u.prompt_tokens });
    if (typeof u.completion_tokens === 'number') entries.push({ label: 'usage.completion_tokens', value: u.completion_tokens });
    if (typeof u.total_tokens === 'number') entries.push({ label: 'usage.total_tokens', value: u.total_tokens });
  }
  if (meta.timings) {
    const t = meta.timings;
    if (typeof t.prompt_ms === 'number') entries.push({ label: 'timings.prompt_ms', value: t.prompt_ms });
    if (typeof t.predicted_ms === 'number') entries.push({ label: 'timings.predicted_ms', value: t.predicted_ms });
    if (typeof t.prompt_n === 'number') entries.push({ label: 'timings.prompt_n', value: t.prompt_n });
    if (typeof t.predicted_n === 'number') entries.push({ label: 'timings.predicted_n', value: t.predicted_n });
  }
  return entries;
}

function renderInlineWithCode(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const [full, code] = m;
    if (m.index > last) {
      const plain = text.slice(last, m.index);
      parts.push(
        <Typography key={`t-${last}`} sx={{ whiteSpace: 'pre-wrap' }} component="span" variant="body2">
          {plain}
        </Typography>
      );
    }
    parts.push(
      <Box key={`c-${m.index}`} component="code" sx={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
        border: '1px solid',
        borderColor: 'divider',
        px: 0.5,
        py: 0.1,
        borderRadius: 0.5,
      }}>
        {code}
      </Box>
    );
    last = m.index + full.length;
  }
  if (last < text.length) {
    const tail = text.slice(last);
    parts.push(
      <Typography key={`t-end-${last}`} sx={{ whiteSpace: 'pre-wrap' }} component="span" variant="body2">
        {tail}
      </Typography>
    );
  }
  return <>{parts}</>;
}

function renderMessageText(text: string) {
  const nodes: React.ReactNode[] = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const full = match[0];
    const code = match[2];
    // preceding text
    if (match.index > last) {
      const before = text.slice(last, match.index);
      nodes.push(
        <Typography key={`p-${last}`} variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {renderInlineWithCode(before)}
        </Typography>
      );
    }
    // code block
    nodes.push(
      <Box key={`pre-${match.index}`} sx={{
        mt: 1,
        mb: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflowX: 'auto',
        bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
      }}>
        <Box component="pre" sx={{ m: 0, p: 1, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: '0.875rem', whiteSpace: 'pre' }}>
          {code}
        </Box>
      </Box>
    );
    last = match.index + full.length;
  }
  if (last < text.length) {
    const rest = text.slice(last);
    nodes.push(
      <Typography key={`p-end-${last}`} variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {renderInlineWithCode(rest)}
      </Typography>
    );
  }
  return <Box>{nodes}</Box>;
}

export const MessagesList: React.FC<MessagesListProps> = ({ messages }) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const endRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    // Initial scroll to bottom on mount with window fallback
    const scrollToBottom = (behavior: 'auto' | 'smooth') => {
      // Primary: ensure the sentinel is visible
      endRef.current?.scrollIntoView({ behavior, block: 'end' });
      // Fallback: force the window to the true bottom (after layout flush)
      try {
        const target = document.scrollingElement || document.documentElement;
        requestAnimationFrame(() => {
          window.scrollTo({ top: target.scrollHeight, behavior });
        });
      } catch {}
    };

    scrollToBottom('auto');
  }, []);

  useEffect(() => {
    // Scroll to bottom whenever a new message is added (after paint)
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      try {
        const target = document.scrollingElement || document.documentElement;
        window.scrollTo({ top: target.scrollHeight, behavior: 'smooth' });
      } catch {}
    });
  }, [messages.length]);

  return (
    <List sx={{ py: 0 }}>
      {messages.map((msg, i) => {
        const hasMeta = msg.sender === 'ai' && !!(msg as any).meta;
        const isExpanded = !!expanded[i];
        const toggle = () => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
        const meta = (msg as any).meta;

        return (
          <ListItem key={i} sx={{ justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.25,
                borderRadius: 2.5,
                maxWidth: '80%',
                bgcolor: (theme) => {
                  const isDark = theme.palette.mode === 'dark';
                  const isUser = msg.sender === 'user';
                  if (isUser) return isDark ? theme.palette.primary.dark : "rgb(51 187 119 / 40%);";
                  return isDark ? theme.palette.grey[800] : theme.palette.grey[50];
                },
                color: 'text.primary'
              }}
            >
              {/* Render message text with lightweight Markdown (code blocks + inline code) */}
              {renderMessageText(msg.text)}

              {hasMeta && (
                <Box sx={{ mt: 0.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="flex-end">
                    <IconButton size="small" onClick={toggle} aria-label={isExpanded ? t('common.hideDetails') : t('common.showDetails')}>
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Stack>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                      {metaEntries(meta).map((e, idx) => (
                        <Stack key={idx} direction="row" spacing={1} sx={{ py: 0.25 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 160 }}>
                            {t(`meta.${e.label}`)}:
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
                            {String(e.value)}
                          </Typography>
                        </Stack>
                      ))}
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Paper>
          </ListItem>
        );
      })}
      <div ref={endRef} />
    </List>
  );
};