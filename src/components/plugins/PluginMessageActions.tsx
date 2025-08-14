import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import { usePluginUI } from '../../plugins/runtime';
import type { Message } from '../../stores/types';

export function PluginMessageActions({ sender, index, message }: { sender: 'user' | 'ai'; index: number; message: Message }) {
  const placement = sender === 'user' ? 'chat.underUserMessage' : 'chat.underAIMessage' as const;
  const items = usePluginUI(placement);
  if (!items.length) return null;
  const ctx = { index, message };
  return (
    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, justifyContent: 'flex-end' }}>
      {items.map((el) => {
        if ((el.kind === 'group' || el.kind === 'dropdown') && el.items?.length) {
          return (
            <React.Fragment key={el.id}>
              {el.items.map((it) => (
                <Tooltip key={it.id} title={it.tooltip || it.id}>
                  <IconButton size="small" onClick={() => it.onClick?.(ctx)} aria-label={it.tooltip || it.id}>
                    <CodeIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ))}
            </React.Fragment>
          );
        }
        if (el.kind === 'custom' && el.component) {
          const Cmp = el.component;
          return <Cmp key={el.id} ctx={ctx} />;
        }
        return (
          <Tooltip key={el.id} title={el.tooltip || el.id}>
            <IconButton size="small" onClick={() => el.onClick?.(ctx)} aria-label={el.tooltip || el.id}>
              <CodeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
}
