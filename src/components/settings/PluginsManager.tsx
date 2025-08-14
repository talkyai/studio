import React, { useEffect, useState } from 'react';
import {
  Card, CardContent, Stack, Typography, Button, List, ListItem,
  ListItemAvatar, Avatar, ListItemText, Switch, Divider,
  IconButton, Dialog, DialogActions, DialogContent, DialogTitle,
  DialogContentText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface PluginFrontendMeta { entry?: string; permissions?: string[] }
interface PluginBackendMeta { entry?: string; permissions?: string[] }
interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  icon?: string | null;
  frontend?: PluginFrontendMeta;
  backend?: PluginBackendMeta;
}
interface PluginInfo { meta: PluginMetadata; enabled: boolean }

export const PluginsManager: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pluginToDelete, setPluginToDelete] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const res = await invoke<PluginInfo[]>('plugins_get_plugins_list');
      setPlugins(res || []);
    } catch (e) {
      console.error('Failed to load plugins', e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const install = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const picked = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'ZIP', extensions: ['zip'] }]
      });
      const path = Array.isArray(picked) ? (picked.length ? String(picked[0]) : '') : String(picked || '');
      if (!path) return;
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('plugins_install_plugin', { zipPath: path });
      // Force-refresh the app so plugins become active immediately
      setTimeout(() => {
        try { window.location.reload(); } catch {}
      }, 50);
      // Fallback: still refresh the list in case reload is blocked
      await load();
    } catch (e) {
      console.error('Install failed', e);
    }
  };

  const toggle = async (id: string, enabled: boolean) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('plugins_toggle_plugin', { pluginId: id, enable: enabled });
      // Force-refresh so plugin enable/disable takes effect immediately
      setTimeout(() => {
        try { window.location.reload(); } catch {}
      }, 50);
      await load();
    } catch (e) {
      console.error('Toggle failed', e);
    }
  };

  const confirmDelete = (pluginId: string) => {
    setPluginToDelete(pluginId);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!pluginToDelete) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('plugins_delete_plugin', { pluginId: pluginToDelete });
      // Force-refresh so plugin removal is reflected immediately
      setTimeout(() => {
        try { window.location.reload(); } catch {}
      }, 50);
      await load();
    } catch (e) {
      console.error('Delete failed', e);
    } finally {
      setDeleteConfirmOpen(false);
      setPluginToDelete(null);
    }
  };

  return (
      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
                 alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Typography variant="h6">Plugins</Typography>
            <Button variant="outlined" onClick={install} disabled={busy}>
              Install from ZIP
            </Button>
          </Stack>
          <Divider sx={{ my: 1.5 }} />
          <List>
            {plugins.map((p) => (
                <ListItem key={p.meta.id}
                          secondaryAction={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Switch
                                  edge="end"
                                  checked={p.enabled}
                                  onChange={(e) => toggle(p.meta.id, e.target.checked)}
                              />
                              <IconButton
                                  edge="end"
                                  aria-label="delete"
                                  onClick={() => confirmDelete(p.meta.id)}
                                  color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Stack>
                          }
                >
                  <ListItemAvatar>
                    <Avatar src={p.meta.icon ? p.meta.icon : undefined}>
                      {p.meta.name?.[0] ?? '?'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                      primary={`${p.meta.name} v${p.meta.version}`}
                      secondary={
                        <>
                          {p.meta.description}
                          <br />
                          <small>ID: {p.meta.id}</small>
                        </>
                      }
                  />
                </ListItem>
            ))}
            {plugins.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No plugins installed.
                </Typography>
            )}
          </List>
        </CardContent>

        <Dialog
            open={deleteConfirmOpen}
            onClose={() => setDeleteConfirmOpen(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this plugin? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
  );
};