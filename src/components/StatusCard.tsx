import { Card, CardContent, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ScheduleIcon from '@mui/icons-material/Schedule';

export type Step = {
  label: string;
  active?: boolean;
  done?: boolean;
};

interface StatusCardProps {
  title: string;
  progress: number;
  message?: string;
  status?: 'idle' | 'downloading' | 'extracting' | 'completed' | 'error';
  steps?: Step[];
}

export function StatusCard({ progress, message,  steps = [] }: StatusCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">{message}</Typography>
          <Typography variant="caption" fontWeight={600}>{Math.min(100, Math.max(0, Math.round(progress)))}%</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, progress))} />

        {steps.length > 0 && (
          <List dense sx={{ mt: 1 }}>
            {steps.map((s, i) => (
              <ListItem key={i} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {s.done ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : s.active ? (
                    <ScheduleIcon color="primary" fontSize="small" />
                  ) : (
                    <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={s.label} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}