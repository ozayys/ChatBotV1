import React, { useState } from 'react';
import { TextField, Button, Box, Paper, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={4}
      sx={{
        width: '100%',
        padding: 2,
        backgroundColor: (theme) => theme.palette.background.paper,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Mesajınızı yazın..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isLoading}
          autoComplete="off"
          size="small"
          multiline
          maxRows={4}
          sx={{ 
            flex: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!message.trim() || isLoading}
          sx={{
            minWidth: '60px',
            height: '40px',
            borderRadius: 2,
            px: 2,
          }}
        >
          {isLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <SendIcon />
          )}
        </Button>
      </Box>
    </Paper>
  );
};

export default MessageInput; 