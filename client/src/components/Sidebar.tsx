import React, { useState, useEffect, useContext } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  ListItemIcon, 
  Divider, 
  Typography, 
  IconButton, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatIcon from '@mui/icons-material/Chat';
import ForumIcon from '@mui/icons-material/Forum';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// Define ModelType here since there seems to be an import issue
type ModelType = 'api' | 'custom' | 'mistral';

interface Conversation {
  id: number;
  title: string;
  modelType: ModelType;
  messageCount: number;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// Kenar çubuğu stilleri
const SidebarContainer = styled(Box)(({ theme }) => ({
  width: 280,
  height: '100%',
  borderRight: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'hidden',
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    height: 'auto',
    borderRight: 'none',
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

const SidebarHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

interface SidebarProps {
  onConversationSelect?: (id: number) => void;
  selectedConversationId?: number;
}

const API_URL = 'http://localhost:5000/api';

const Sidebar: React.FC<SidebarProps> = ({ onConversationSelect, selectedConversationId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [newConversationModel, setNewConversationModel] = useState<ModelType>('api');
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();

  // Sohbet listesini çek
  const fetchConversations = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No auth token found');
        setError('Oturum bilgisi bulunamadı, lütfen tekrar giriş yapın');
        return;
      }
      
      console.log('Fetching conversations from:', `${API_URL}/chat/conversations`);
      console.log('Using token:', token.substring(0, 15) + '...');
      
      const response = await axios.get(`${API_URL}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Server response:', response.data);
      setConversations(response.data.conversations || []);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server error response:', err.response.status, err.response.data);
        if (err.response.status === 401) {
          setError('Oturum süresi dolmuş, lütfen tekrar giriş yapın');
        } else if (err.response.status === 404) {
          setError('API endpoint bulunamadı. Sunucu çalışıyor mu?');
        } else {
          setError(`Sohbet listesi yüklenemedi: ${err.response.data.message || 'Sunucu hatası'}`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        setError('Sunucudan yanıt alınamadı. Ağ bağlantınızı kontrol edin.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', err.message);
        setError(`İstek hatası: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [isAuthenticated]);

  // Yeni sohbet oluştur
  const handleCreateConversation = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Oturum süresi dolmuş');
        return;
      }
      
      console.log('Creating conversation with:', { 
        title: newConversationTitle || 'Yeni Sohbet', 
        modelType: newConversationModel 
      });
      
      const response = await axios.post(
        `${API_URL}/chat/conversations`, 
        { 
          title: newConversationTitle || 'Yeni Sohbet', 
          modelType: newConversationModel 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Server response:', response.data);
      
      setOpenNewDialog(false);
      setNewConversationTitle('');
      
      // Sohbet listesini yenile ve yeni sohbete git
      await fetchConversations();
      if (response.data.conversationId) {
        if (onConversationSelect) {
          onConversationSelect(response.data.conversationId);
        } else {
          navigate(`/chat/${response.data.conversationId}`);
        }
      } else {
        console.error('No conversationId in response:', response.data);
        setError('Sohbet oluşturuldu fakat ID alınamadı');
      }
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      let errorMessage = 'Sohbet oluşturulamadı';
      if (err.response) {
        console.error('Server error response:', err.response.data);
        errorMessage = `Hata: ${err.response.data.message || err.message}`;
      }
      setError(errorMessage);
    }
  };

  // Sohbet sil
  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `${API_URL}/chat/conversations/${conversationToDelete}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOpenDeleteDialog(false);
      setConversationToDelete(null);
      
      // Sohbet listesini yenile
      await fetchConversations();
      
      // Eğer silinen sohbet şu an seçili olan ise ana sayfaya yönlendir
      if (selectedConversationId === conversationToDelete || 
          Number(conversationId) === conversationToDelete) {
        navigate('/chat');
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Sohbet silinemedi');
    }
  };

  // Silme onay dialogu aç
  const confirmDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();  // Sohbet seçme olayını engelle
    setConversationToDelete(id);
    setOpenDeleteDialog(true);
  };

  return (
    <SidebarContainer>
      <SidebarHeader>
        <Typography variant="h6" component="div">
          Sohbetlerim
        </Typography>
        <Tooltip title="Yeni Sohbet">
          <IconButton 
            color="primary" 
            onClick={() => setOpenNewDialog(true)}
            edge="end"
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </SidebarHeader>
      
      <Divider />
      
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography color="error" align="center" py={2}>
            {error}
          </Typography>
        ) : conversations.length === 0 ? (
          <Typography variant="body2" color="textSecondary" align="center" py={2}>
            Henüz sohbet bulunmuyor. Yeni bir sohbet başlatın!
          </Typography>
        ) : (
          <List>
            {conversations.map((conversation) => (
              <ListItem 
                key={conversation.id} 
                disablePadding
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    onClick={(e) => confirmDelete(conversation.id, e)}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton 
                  selected={selectedConversationId === conversation.id || 
                            Number(conversationId) === conversation.id}
                  onClick={() => {
                    if (onConversationSelect) {
                      onConversationSelect(conversation.id);
                    } else {
                      navigate(`/chat/${conversation.id}`);
                    }
                  }}
                >
                  <ListItemIcon>
                    {conversation.modelType === 'api' ? 
                      <ChatIcon color="primary" /> : 
                      <ForumIcon color="secondary" />}
                  </ListItemIcon>
                  <ListItemText 
                    primary={conversation.title} 
                    secondary={
                      conversation.lastMessage ? 
                      `${conversation.lastMessage.substring(0, 20)}...` : 
                      `${conversation.messageCount} mesaj`
                    }
                    primaryTypographyProps={{
                      noWrap: true,
                      style: { maxWidth: '140px' }
                    }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      style: { maxWidth: '140px' }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
      
      {/* Yeni Sohbet Dialog */}
      <Dialog open={openNewDialog} onClose={() => setOpenNewDialog(false)}>
        <DialogTitle>Yeni Sohbet</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Sohbet Başlığı"
            type="text"
            fullWidth
            variant="outlined"
            value={newConversationTitle}
            onChange={(e) => setNewConversationTitle(e.target.value)}
            placeholder="Yeni Sohbet"
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Model Tipi:
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" gap={1}>
                <Button 
                  variant={newConversationModel === 'api' ? 'contained' : 'outlined'}
                  onClick={() => setNewConversationModel('api')}
                  fullWidth
                  color="primary"
                  sx={{ py: 1 }}
                >
                  🌐 CHATGPT API
                </Button>
                <Button 
                  variant={newConversationModel === 'custom' ? 'contained' : 'outlined'}
                  onClick={() => setNewConversationModel('custom')}
                  fullWidth
                  color="secondary"
                  sx={{ py: 1 }}
                >
                  🤖 CODEPARROT
                </Button>
              </Box>
              <Button 
                variant={newConversationModel === 'mistral' ? 'contained' : 'outlined'}
                onClick={() => setNewConversationModel('mistral')}
                fullWidth
                color="warning"
                sx={{ py: 1 }}
              >
                🚀 MISTRAL 7B
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewDialog(false)}>İptal</Button>
          <Button 
            onClick={handleCreateConversation} 
            variant="contained" 
            color="primary"
            disabled={loading}
            sx={{ px: 3 }}
          >
            {loading ? <CircularProgress size={24} /> : 'OLUŞTUR'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Silme Onay Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Sohbeti Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu sohbeti silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>İptal</Button>
          <Button onClick={handleDeleteConversation} color="error" variant="contained">
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </SidebarContainer>
  );
};

export default Sidebar; 