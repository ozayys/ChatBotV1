import React from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  Divider, 
  Chip,
  Card,
  CardContent
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ApiIcon from '@mui/icons-material/Cloud';
import CustomModelIcon from '@mui/icons-material/Psychology';
import PersonIcon from '@mui/icons-material/Person';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: number;
  message: string;
  response: string;
  modelType: 'api' | 'custom' | 'mistral';
  createdAt: string;
}

interface MessagesListProps {
  messages: Message[];
}

const MessageContainer = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  maxWidth: '75%',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  borderRadius: '16px',
}));

const UserMessage = styled(MessageContainer)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  marginLeft: 'auto',
  borderBottomRightRadius: '4px',
}));

const BotMessage = styled(MessageContainer)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#f8f9fa',
  color: theme.palette.text.primary,
  marginRight: 'auto',
  borderBottomLeftRadius: '4px',
  border: `1px solid ${theme.palette.divider}`,
}));

// Enhanced code detection and formatting
const formatMessage = (text: string) => {
  // Handle complete message with mixed content
  const parts = [];
  let currentIndex = 0;
  
  // Find all code blocks first
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > currentIndex) {
      const beforeText = text.slice(currentIndex, match.index);
      if (beforeText.trim()) {
        parts.push({
          type: 'text',
          content: beforeText,
          index: parts.length
        });
      }
    }
    
    // Add code block
    const language = match[1] || 'text';
    const code = match[2].trim();
    
    parts.push({
      type: 'code',
      language,
      content: code,
      index: parts.length
    });
    
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    if (remainingText.trim()) {
      parts.push({
        type: 'text',
        content: remainingText,
        index: parts.length
      });
    }
  }
  
  // If no code blocks found, treat as regular text
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: text,
      index: 0
    });
  }
  
  return parts.map((part) => {
    if (part.type === 'code') {
      return (
        <Box key={part.index} sx={{ mb: 2 }}>
          <SyntaxHighlighter
            language={part.language}
            style={vscDarkPlus}
            customStyle={{
              borderRadius: '8px',
              fontSize: '13px',
              margin: 0,
              padding: '16px',
              backgroundColor: '#1e1e1e',
            }}
            wrapLongLines={true}
            showLineNumbers={part.content.split('\n').length > 3}
          >
            {part.content}
          </SyntaxHighlighter>
        </Box>
      );
    }
    
    // Format regular text
    const paragraphs = part.content.split('\n\n');
    
    return paragraphs.map((paragraph, pIndex) => {
      // Check for inline code `code`
      const inlineCodeFormatted = paragraph.replace(/`([^`]+)`/g, '<code style="background-color: #f1f2f6; padding: 2px 6px; border-radius: 4px; font-family: Consolas, Monaco, monospace; color: #d63384; font-size: 0.875em;">$1</code>');
      
      // Handle bold text **text**
      const boldFormatted = inlineCodeFormatted.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');
      
      // Handle bullet points
      const bulletFormatted = boldFormatted.replace(/^• (.+)$/gm, '<li style="margin-bottom: 4px; list-style-type: disc;">$1</li>');
      
      // Check if this paragraph has list items
      const hasListItems = bulletFormatted.includes('<li');
      
      if (hasListItems) {
        return (
          <Box key={`${part.index}-${pIndex}`} component="ul" sx={{ 
            pl: 3, 
            mb: 1.5,
            '& li': {
              marginBottom: '4px',
              lineHeight: 1.6
            }
          }}>
            <div dangerouslySetInnerHTML={{ __html: bulletFormatted }} />
          </Box>
        );
      }
      
      return (
        <Typography 
          key={`${part.index}-${pIndex}`}
          variant="body1" 
          sx={{ 
            mb: pIndex !== paragraphs.length - 1 ? 1.5 : 0,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap'
          }}
          dangerouslySetInnerHTML={{ __html: boldFormatted }}
        />
      );
    });
  });
};

const MessagesList: React.FC<MessagesListProps> = ({ messages }) => {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box sx={{ 
      flex: 1,
      overflowY: 'auto', 
      padding: 2,
      paddingBottom: 2,
      display: 'flex',
      flexDirection: 'column',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: '#f1f1f1',
        borderRadius: '10px',
      },
      '&::-webkit-scrollbar-thumb': {
        background: '#c1c1c1',
        borderRadius: '10px',
      },
      '&::-webkit-scrollbar-thumb:hover': {
        background: '#a8a8a8',
      },
    }}>
      {messages.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <Box textAlign="center">
            <SmartToyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography color="textSecondary" variant="h6" gutterBottom>
              Henüz mesaj yok
            </Typography>
            <Typography color="textSecondary" variant="body2">
              Sohbete başlamak için bir mesaj yazın!
            </Typography>
          </Box>
        </Box>
      ) : (
        messages.map((message) => (
          <div key={message.id}>
            {/* User Message */}
            <Box display="flex" alignItems="flex-end" mb={1} justifyContent="flex-end">
              <Box display="flex" flexDirection="column" alignItems="flex-end" mr={1}>
                <Typography variant="caption" color="textSecondary" mb={0.5}>
                  Sen • {formatTime(message.createdAt)}
                </Typography>
                <UserMessage elevation={2}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="body1">{message.message}</Typography>
                  </CardContent>
                </UserMessage>
              </Box>
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
            </Box>

            {/* Bot Response */}
            <Box display="flex" alignItems="flex-start" mb={3} mt={2}>
              <Avatar sx={{ 
                bgcolor: 
                  message.modelType === 'api' ? '#10a37f' : 
                  message.modelType === 'custom' ? '#7c3aed' : 
                  '#f57c00',
                width: 32, 
                height: 32,
                mr: 1
              }}>
                {message.modelType === 'api' ? 
                  <ApiIcon fontSize="small" /> : 
                  message.modelType === 'custom' ?
                  <CustomModelIcon fontSize="small" /> :
                  <CustomModelIcon fontSize="small" />
                }
              </Avatar>
              <Box display="flex" flexDirection="column" alignItems="flex-start" flex={1}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="caption" color="textSecondary">
                    {formatTime(message.createdAt)}
                  </Typography>
                  <Chip
                    label={
                      message.modelType === 'api' ? 'ChatGPT' : 
                      message.modelType === 'custom' ? 'CodeParrot' : 
                      'Mistral 7B'
                    }
                    size="small"
                    variant="outlined"
                    color={
                      message.modelType === 'api' ? 'success' : 
                      message.modelType === 'custom' ? 'secondary' : 
                      'warning'
                    }
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Box>
                <BotMessage elevation={1}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    {formatMessage(message.response)}
                  </CardContent>
                </BotMessage>
              </Box>
            </Box>
            
            {/* Divider between conversations */}
            {message.id !== messages[messages.length - 1]?.id && (
              <Divider sx={{ my: 2, opacity: 0.3 }} />
            )}
          </div>
        ))
      )}
    </Box>
  );
};

export default MessagesList; 