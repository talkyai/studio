import { Snackbar, Alert, Slide } from '@mui/material';
import { useNotifications, removeNotification, NotificationItem } from '../ui/notifications';

function SlideTransition(props: any) {
  return <Slide {...props} direction="left" />;
}

export function NotificationsHost() {
  const items = useNotifications();

  // Render stack in top-right; offset each snackbar
  return (
    <>
      {items.map((n: NotificationItem, idx: number) => (
        <Snackbar
          key={n.id}
          open
          TransitionComponent={SlideTransition}
          autoHideDuration={n.duration}
          onClose={(_, reason) => {
            if (reason === 'clickaway') return;
            removeNotification(n.id);
          }}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            mt: `${8 + idx * 60}px`,
            '& .MuiPaper-root': { minWidth: 240 },
          }}
        >
          <Alert
            onClose={() => removeNotification(n.id)}
            severity={n.type}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {n.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}

export default NotificationsHost;
