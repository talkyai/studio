import { Button, Stack, TextField } from "@mui/material";
import React from "react";

interface InputBarProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  sendLabel?: string;
}

export const InputBar: React.FC<InputBarProps> = ({ input, setInput, onSend, disabled, placeholder, sendLabel }) => {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <TextField
        fullWidth
        size="medium"
        multiline
        minRows={2}
        maxRows={12}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
        sx={{
          '& .MuiInputBase-input': {
            whiteSpace: 'pre-wrap',
            fontFamily: 'Inter, Avenir, Helvetica, Arial, sans-serif',
          }
        }}
      />
      <Button
        variant="contained"
        disableElevation
        onClick={onSend}
        disabled={!input.trim() || disabled}
        sx={{ px: 2.5, borderRadius: 2 }}
        aria-label={sendLabel ?? 'Отправить'}
      >
        {sendLabel ?? 'Отправить'}
      </Button>
    </Stack>
  );
};