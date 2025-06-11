import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  CircularProgress, 
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { AuthContext } from '../context/AuthContext';
import MessageInput from '../components/MessageInput';
import MessagesList from '../components/MessagesList';
import ModelSelector from '../components/ModelSelector';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Message, ModelType } from '../types';

const API_URL = 'http://localhost:5000/api';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [modelType, setModelType] = useState<ModelType>('api');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useContext(AuthContext);
  const { conversationId } = useParams<{ conversationId: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Kullanıcı giriş yapmış mı kontrol et
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Mesajları en altta göster
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Konuşma veya mesaj listesi değiştiğinde otomatik kaydırma
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Sohbet geçmişini yükle
  useEffect(() => {
    if (isAuthenticated && conversationId) {
      loadConversationMessages();
    } else {
      setInitialLoading(false);
    }
  }, [isAuthenticated, conversationId]);

  // Model değiştiğinde localStorage'a kaydet
  const handleModelChange = (newModel: ModelType) => {
    setModelType(newModel);
    localStorage.setItem('selectedModel', newModel);
  };

  // Sayfa yüklendiğinde model tercihini yükle
  useEffect(() => {
    const savedModel = localStorage.getItem('selectedModel') as ModelType;
    if (savedModel && ['api', 'custom', 'mistral'].includes(savedModel)) {
      setModelType(savedModel);
    }
  }, []);

  // Belirli bir konuşmanın mesajlarını yükle
  const loadConversationMessages = async () => {
    try {
      setInitialLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) return;

      const response = await axios.get(`${API_URL}/chat/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(response.data.messages || []);
      
      // Konuşmanın gerçek model tipini yükle (backend'den conversation object'i kullan)
      if (response.data.conversation && response.data.conversation.modelType) {
        const conversationModelType = response.data.conversation.modelType;
        console.log(`Chat switching to conversation with model: ${conversationModelType}`);
        setModelType(conversationModelType);
      }
    } catch (err) {
      console.error('Error loading conversation messages:', err);
      setError('Mesajlar yüklenemedi');
    } finally {
      setInitialLoading(false);
    }
  };

  // Yeni mesaj gönder
  const handleSendMessage = async (message: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Oturum sonlanmış');
        navigate('/login');
        return;
      }

      // Matematik sorusu mu kontrol et (basit bir kontrol)
      const isMathRelated = /[+\-*/=^]|\d+/.test(message);

      const response = await axios.post(
        `${API_URL}/chat/messages`,
        { 
          message, 
          modelType, 
          conversationId: conversationId || undefined,
          isMathRelated 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Yeni konuşma oluşturulduysa yönlendir
      if (!conversationId && response.data.conversationId) {
        navigate(`/chat/${response.data.conversationId}`);
      } else {
        // Mesajları güncelle
        setMessages(prevMessages => [...prevMessages, response.data]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Mesaj gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  // Konuşma yönlendirmesi
  const handleConversationSelect = (id: number) => {
    navigate(`/chat/${id}`);
  };

  // Konuşma temizle
  const handleClearConversation = async () => {
    if (!conversationId) return;
    
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `${API_URL}/chat/conversations/${conversationId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages([]);
    } catch (err) {
      console.error('Error clearing conversation:', err);
      setError('Konuşma temizlenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="h5">Bu sayfayı görüntülemek için giriş yapmalısınız.</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Mobil görünümde sidebar gösterme */}
      {!isMobile && (
        <Sidebar 
          onConversationSelect={handleConversationSelect} 
          selectedConversationId={conversationId ? Number(conversationId) : undefined} 
        />
      )}
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Paper elevation={0} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">
                {conversationId ? 'Aktif Sohbet' : 'Yeni Sohbet'}
              </Typography>
            </Box>
            
            <Box>
              {conversationId && (
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<DeleteIcon />}
                  onClick={handleClearConversation}
                  disabled={loading || messages.length === 0}
                  size="small"
                >
                  Temizle
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
        
        <Box sx={{ px: 2, py: 1 }}>
          <ModelSelector 
            selectedModel={modelType} 
            onModelChange={handleModelChange}
            disabled={loading}
            showInfo={true}
          />
        </Box>
        
        {error && (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        )}
        
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0
        }}>
          {initialLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : conversationId && messages.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography color="textSecondary">
                Bu sohbette henüz mesaj bulunmuyor
              </Typography>
            </Box>
          ) : !conversationId ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography color="textSecondary" align="center" sx={{ maxWidth: '400px', p: 2 }}>
                Yeni bir sohbet başlatmak için mesaj yazın veya 
                kenar çubuğundan bir sohbet seçin
              </Typography>
            </Box>
          ) : (
            <>
              <MessagesList messages={messages} />
              <div ref={messagesEndRef} />
            </>
          )}
        </Box>
        
        <Box sx={{ 
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}>
          <MessageInput onSendMessage={handleSendMessage} isLoading={loading} />
        </Box>
      </Box>
    </Box>
  );
};

export default Chat; 