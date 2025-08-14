import React from 'react';
import { Box, IconButton, Tooltip, Divider, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { usePluginUI } from '../../plugins/runtime';

export function PluginSettingsPanel() {
  const items = usePluginUI('settings.panel');
  if (!items.length) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <SettingsIcon fontSize="small" color="action" />
        <Typography variant="subtitle2" sx={{ ml: 1 }}>
          Plugin settings
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {items.map((el) => {
          if ((el.kind === 'group' || el.kind === 'dropdown') && el.items?.length) {
            return (
              <React.Fragment key={el.id}>
                {el.items.map((it) => (
                  <Tooltip key={it.id} title={it.tooltip || it.id}>
                    <IconButton color="primary" size="small" onClick={() => it.onClick?.()} aria-label={it.tooltip || it.id}>
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ))}
              </React.Fragment>
            );
          }
          if ((el.kind === 'custom' || el.kind === 'form') && el.component) {
            const Cmp = el.component;
            return <Cmp key={el.id} />;
          }
          return (
            <Tooltip key={el.id} title={el.tooltip || el.id}>
              <IconButton color="primary" size="small" onClick={() => el.onClick?.()} aria-label={el.tooltip || el.id}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        })}
      </Box>
      <Divider sx={{ mt: 1 }} />
    </Box>
  );
}
