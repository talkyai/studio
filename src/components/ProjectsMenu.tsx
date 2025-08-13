  import { useEffect, useMemo, useState } from 'react';
  import { Button, Menu, Typography, List, ListItemButton, ListItemText, Collapse, Box, Stack, Divider } from '@mui/material';
  import FolderOpenIcon from '@mui/icons-material/FolderOpen';
  import ExpandLess from '@mui/icons-material/ExpandLess';
  import ExpandMore from '@mui/icons-material/ExpandMore';
  import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
  import { useChatStore } from '../stores/chatStore';
  import { useTranslation } from 'react-i18next';

  // Expandable hierarchical projects dropdown for AppBar
  export function ProjectsMenu() {
    const { projects, loadProjects, activateProject, activeProjectId, deleteProject } = useChatStore();
    const { t } = useTranslation();

    // Root menu anchor
    const [rootAnchor, setRootAnchor] = useState<null | HTMLElement>(null);

    // Expanded nodes
    const [openModes, setOpenModes] = useState<Set<string>>(new Set());
    const [openProviders, setOpenProviders] = useState<Set<string>>(new Set()); // key: `${mode}:${provider}`
    const [openServers, setOpenServers] = useState<Set<string>>(new Set()); // key: `${mode}:${provider}:${server}`

    useEffect(() => {
      loadProjects().catch(() => {});
    }, []);

    // Build hierarchy: Mode -> Provider -> Server -> [Projects]
    const grouped = useMemo(() => {
      const out = new Map<string, Map<string, Map<string, typeof projects>>>();
      for (const p of projects) {
        const wm = p.work_mode || 'unknown';
        const prov = p.provider || 'unknown';
        const srv = p.server || 'unknown';
        if (!out.has(wm)) out.set(wm, new Map());
        const pmap = out.get(wm)!;
        if (!pmap.has(prov)) pmap.set(prov, new Map());
        const smap = pmap.get(prov)!;
        if (!smap.has(srv)) smap.set(srv, [] as any);
        smap.get(srv)!.push(p);
      }
      return out;
    }, [projects]);

    const closeAll = () => {
      setRootAnchor(null);
    };

    const toggleMode = (key: string) => {
      setOpenModes(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    };
    const toggleProvider = (mode: string, prov: string) => {
      const key = `${mode}:${prov}`;
      setOpenProviders(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    };
    const toggleServer = (mode: string, prov: string, srv: string) => {
      const key = `${mode}:${prov}:${srv}`;
      setOpenServers(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    };

    return (
      <>
        <Button
          color="primary"
          startIcon={<FolderOpenIcon />}
          onClick={(e) => setRootAnchor(e.currentTarget)}
        >
          {t('projects.title') ?? 'Проекты'}
        </Button>

        <Menu
          anchorEl={rootAnchor}
          open={Boolean(rootAnchor)}
          onClose={closeAll}
          PaperProps={{ sx: { width: 360, maxHeight: 480, p: 0.5 } }}
        >
          <Typography variant="subtitle2" sx={{ px: 2, pt: 1, pb: 1, color: 'text.secondary' }}>
            {projects.length ? t('projects.title') ?? 'Проекты' : (t('projects.empty') ?? 'Проектов пока нет')}
          </Typography>
          <Divider />
          {projects.length === 0 ? null : (
            <Box sx={{ px: 0.5 }}>
              <List dense disablePadding>
                {Array.from(grouped.entries()).map(([wm, provMap]) => {
                  const mOpen = openModes.has(wm);
                  return (
                    <Box key={wm}>
                      <ListItemButton onClick={() => toggleMode(wm)}>
                        <ListItemText primary={`${t('projects.mode') || 'Режим'}: ${wm}`} />
                        {mOpen ? <ExpandLess /> : <ExpandMore />}
                      </ListItemButton>
                      <Collapse in={mOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding dense>
                          {Array.from(provMap.entries()).map(([prov, srvMap]) => {
                            const pk = `${wm}:${prov}`;
                            const pOpen = openProviders.has(pk);
                            return (
                              <Box key={pk}>
                                <ListItemButton sx={{ pl: 3 }} onClick={() => toggleProvider(wm, prov)}>
                                  <ListItemText primary={`${t('projects.provider') || 'Провайдер'}: ${prov}`} />
                                  {pOpen ? <ExpandLess /> : <ExpandMore />}
                                </ListItemButton>
                                <Collapse in={pOpen} timeout="auto" unmountOnExit>
                                  <List component="div" disablePadding dense>
                                    {Array.from(srvMap.entries()).map(([srv, projs]) => {
                                      const sk = `${wm}:${prov}:${srv}`;
                                      const sOpen = openServers.has(sk);
                                      return (
                                        <Box key={sk}>
                                          <ListItemButton sx={{ pl: 5 }} onClick={() => toggleServer(wm, prov, srv)}>
                                            <ListItemText primary={`${t('projects.server') || 'Сервер'}: ${srv}`} />
                                            {sOpen ? <ExpandLess /> : <ExpandMore />}
                                          </ListItemButton>
                                          <Collapse in={sOpen} timeout="auto" unmountOnExit>
                                            <List component="div" disablePadding dense>
                                              {projs.map((p) => (
                                                <Box key={p.id} sx={{ pl: 7, pr: 1, py: 0.5 }}>
                                                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                                    <ListItemText secondary={`${t('projects.model') || 'Модель'}: ${p.model || '—'}`} primary={p.name ? `${t('app.projectLabel') || 'Проект'}: ${p.name}` : undefined} />
                                                    <Button
                                                      size="small"
                                                      variant="outlined"
                                                      disabled={activeProjectId === p.id}
                                                      onClick={async () => { try { await activateProject(p.id); } finally { closeAll(); } }}
                                                    >{activeProjectId === p.id ? (t('projects.active') ?? 'Активен') : `${t('projects.open') ?? 'Открыть'}`}</Button>
                                                    <Button
                                                      size="small"
                                                      color="error"
                                                      variant="text"
                                                      startIcon={<DeleteOutlineIcon fontSize="small" />}
                                                      onClick={async () => { try { await deleteProject(p.id); } catch {} }}
                                                    >{`${t('projects.delete') ?? 'Удалить'}`}</Button>
                                                  </Stack>
                                                </Box>
                                              ))}
                                            </List>
                                          </Collapse>
                                        </Box>
                                      );
                                    })}
                                  </List>
                                </Collapse>
                              </Box>
                            );
                          })}
                        </List>
                      </Collapse>
                    </Box>
                  );
                })}
              </List>
            </Box>
          )}
        </Menu>
      </>
    );
  }
