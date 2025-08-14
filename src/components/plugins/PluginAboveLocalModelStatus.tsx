import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import { usePluginUI } from '../../plugins/runtime';

export function PluginAboveLocalModelStatus() {
  const items = usePluginUI('chat.aboveLocalModelStatus');
  if (!items.length) return null;
  return (
    <Box sx={{ display: 'flex', gap: 0.5, p: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      {items.map((el) => {
        if ((el.kind === 'group' || el.kind === 'dropdown') && el.items?.length) {
          return (
            <React.Fragment key={el.id}>
              {el.items.map((it) => (
                <Tooltip key={it.id} title={it.tooltip || it.id}>
                  <IconButton color="primary" size="small" onClick={() => it.onClick?.()} aria-label={it.tooltip || it.id}>
                    <CodeIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ))}
            </React.Fragment>
          );
        }
        if (el.kind === 'custom' && el.component) {
          const Cmp = el.component;
          return <Cmp key={el.id} />;
        }
        return (
          <Tooltip key={el.id} title={el.tooltip || el.id}>
            <IconButton color="primary" size="small" onClick={() => el.onClick?.()} aria-label={el.tooltip || el.id}>
              <CodeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
}
