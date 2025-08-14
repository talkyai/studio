import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import { usePluginUI } from '../../plugins/runtime';

export function PluginToolbarButtons() {
  const items = usePluginUI('app.toolbar');
  if (!items.length) return null;
  return (
    <>
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
        // default: button
        return (
          <Tooltip key={el.id} title={el.tooltip || el.id}>
            <IconButton color="primary" size="small" onClick={() => el.onClick?.()} aria-label={el.tooltip || el.id}>
              <CodeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      })}
    </>
  );
}
