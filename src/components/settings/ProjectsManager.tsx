import { useEffect, useMemo, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import {
  Card,
  CardContent,
  Stack,
  TextField,
  Button,
  Typography,
  Divider,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  Chip
} from '@mui/material';
import {
  Delete,
  ExpandMore,
  ExpandLess,
  FolderOpen,
  Settings,
  Cloud,
  Storage,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export function ProjectsManager() {
  const { mode, projects, loadProjects, saveCurrentAsProject, deleteProject, activateProject, activeProjectId } = useChatStore();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { t } = useTranslation();

  useEffect(() => {
    loadProjects().catch(() => {});
  }, [mode]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const groupedByProject = useMemo(() => {
    const map = new Map<string, typeof projects>();
    for (const p of projects) {
      const key = p.name || t('projects.unnamed') || '(без имени)';
      if (!map.has(key)) map.set(key, [] as any);
      (map.get(key) as any).push(p);
    }
    return map;
  }, [projects]);

  return (
      <Card variant="outlined" sx={{  margin: '0 auto' }}>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FolderOpen color="primary" /> {t('projects.title')}
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <TextField
                  size="small"
                  label={t('projects.nameLabel') || 'Название проекта'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  sx={{ flex: 1 }}
                  fullWidth
              />
              <Button
                  disabled={!name.trim() || saving}
                  variant="contained"
                  startIcon={<Settings />}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await saveCurrentAsProject(name.trim());
                      setName('');
                    } finally {
                      setSaving(false);
                    }
                  }}
              >
                {t('projects.saveCurrent')}
              </Button>
            </Stack>

            <Divider />

            {projects.length === 0 ? (
                <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                  {t('projects.empty')}
                </Typography>
            ) : (
                <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                  {Array.from(groupedByProject.entries()).map(([projectName, projs]) => {
                    const key = `proj-${projectName}`;
                    const isOpen = !!expandedGroups[key];
                    return (
                      <div key={key}>
                        <ListItemButton
                          onClick={() => toggleGroup(key)}
                          sx={{ backgroundColor: isOpen ? 'action.hover' : 'inherit', borderRadius: 1 }}
                        >
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {isOpen ? <ExpandLess /> : <ExpandMore />}
                                <Chip label={t('projects.projectChip') || 'Проект'} color="primary" size="small" />
                                {projectName}
                              </Typography>
                            }
                            secondary={projs?.length > 1 ? (t('projects.configsCount', { count: projs.length }) as string) : undefined}
                          />
                        </ListItemButton>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <List component="div" disablePadding>
                            {projs.map((p: any) => {
                              const rowKey = `${key}-${p.id}`;
                              const active = activeProjectId === p.id;
                              return (
                                <ListItem key={rowKey} sx={{ pl: 4 }}>
                                  <ListItemText
                                    primary={
                                      <Stack direction="row" alignItems="center" spacing={1}>
                                        <Chip label={t('projects.model') || 'Модель'} size="small" variant="outlined" />
                                        <Typography variant="body1">{p.model || '—'}</Typography>
                                      </Stack>
                                    }
                                    secondary={t('projects.summaryPattern', { mode: p.work_mode || '—', provider: p.provider || '—', server: p.server || '—' }) as string}
                                  />
                                  <ListItemSecondaryAction>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Button
                                        size="small"
                                        variant={active ? 'contained' : 'outlined'}
                                        color={active ? 'success' : 'primary'}
                                        startIcon={active ? <Cloud /> : <Storage />}
                                        onClick={() => activateProject(p.id)}
                                      >
                                        {active ? (t('projects.active') || 'Активен') : (t('projects.activate') || 'Активировать')}
                                      </Button>
                                      <IconButton size="small" color="error" onClick={() => deleteProject(p.id)} aria-label="Удалить проект">
                                        <Delete />
                                      </IconButton>
                                    </Stack>
                                  </ListItemSecondaryAction>
                                </ListItem>
                              );
                            })}
                          </List>
                        </Collapse>
                      </div>
                    );
                  })}
                </List>
            )}
          </Stack>
        </CardContent>
      </Card>
  );
}