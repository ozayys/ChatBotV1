import React, { useState, useEffect, useContext } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Avatar, 
  Grid, 
  Button, 
  Divider, 
  Switch, 
  TextField, 
  FormControlLabel,
  Alert, 
  CircularProgress,
  Card,
  CardContent,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { AccountCircle, BarChart, Settings } from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';
import { UserSettings, UserStatistics, ModelType } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const API_URL = 'http://localhost:5000/api';

const Profile: React.FC = () => {
  const { user, logout, isAuthenticated } = useContext(AuthContext);
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Kullanıcı ayarları ve istatistikleri
  const [settings, setSettings] = useState<UserSettings>({
    theme: darkMode ? 'dark' : 'light',
    language: 'tr',
    preferredModel: 'api',
    notificationsEnabled: true
  });
  
  const [statistics, setStatistics] = useState<UserStatistics>({
    totalConversations: 0,
    totalMessages: 0,
    mathQuestionsCount: 0,
    generalQuestionsCount: 0,
    apiModelUses: 0,
    customModelUses: 0,
    lastActiveAt: new Date().toISOString()
  });

  // Profil Düzenleme
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
    
    if (isAuthenticated) {
      fetchUserData();
    }
  }, [user, isAuthenticated]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Ayarları getir
      const settingsResponse = await axios.get(`${API_URL}/chat/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSettings(settingsResponse.data);
      
      // İstatistikleri getir
      const statsResponse = await axios.get(`${API_URL}/chat/statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStatistics(statsResponse.data);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Profil bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${API_URL}/chat/settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Tema değişikliğini uygula
      if ((settings.theme === 'dark' && !darkMode) || 
          (settings.theme === 'light' && darkMode)) {
        toggleDarkMode();
      }
      
      setSuccess('Ayarlar başarıyla kaydedildi');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Ayarlar kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (newPassword && newPassword !== confirmPassword) {
        setError('Şifreler eşleşmiyor');
        return;
      }

      setLoading(true);
      setError(null);
      setSuccess(null);
      const token = localStorage.getItem('token');
      
      // Profil güncelleme endpoint'i eklenecek
      await axios.put(
        `${API_URL}/auth/profile`,
        { 
          username, 
          email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Profil başarıyla güncellendi');
      setEditMode(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Profil güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (_event: React.MouseEvent<HTMLElement>, newModel: ModelType | null) => {
    if (newModel) {
      setSettings({ ...settings, preferredModel: newModel });
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" align="center">
          Bu sayfayı görüntülemek için giriş yapmalısınız.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Avatar 
            sx={{ width: 100, height: 100, mr: 3 }}
          >
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
          
          <Box>
            <Typography variant="h4">{user.username}</Typography>
            <Typography variant="subtitle1" color="textSecondary">{user.email}</Typography>
          </Box>
          
          <Box sx={{ ml: 'auto' }}>
            <Button 
              variant="outlined" 
              color={editMode ? "error" : "primary"} 
              onClick={() => {
                if (editMode) {
                  setUsername(user.username);
                  setEmail(user.email);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }
                setEditMode(!editMode);
              }}
            >
              {editMode ? 'İptal' : 'Düzenle'}
            </Button>
          </Box>
        </Box>
        
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="profile tabs"
          centered
        >
          <Tab icon={<AccountCircle />} label="Profil" />
          <Tab icon={<Settings />} label="Ayarlar" />
          <Tab icon={<BarChart />} label="İstatistikler" />
        </Tabs>

        {/* Profil Tabı */}
        <TabPanel value={tabValue} index={0}>
          {(error || success) && (
            <Alert 
              severity={error ? "error" : "success"} 
              sx={{ mb: 3 }}
              onClose={() => {
                setError(null);
                setSuccess(null);
              }}
            >
              {error || success}
            </Alert>
          )}
          
          {editMode ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px' }}>
                  <TextField
                    label="Kullanıcı Adı"
                    fullWidth
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    margin="normal"
                  />
                </Box>
                <Box sx={{ flex: '1 1 300px' }}>
                  <TextField
                    label="E-posta"
                    fullWidth
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    margin="normal"
                  />
                </Box>
              </Box>
              <Box>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Şifre Değiştir (İsteğe Bağlı)
                  </Typography>
                </Divider>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 200px' }}>
                  <TextField
                    label="Mevcut Şifre"
                    fullWidth
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    margin="normal"
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px' }}>
                  <TextField
                    label="Yeni Şifre"
                    fullWidth
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    margin="normal"
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px' }}>
                  <TextField
                    label="Şifre Tekrar"
                    fullWidth
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    margin="normal"
                    error={newPassword !== confirmPassword && confirmPassword !== ''}
                    helperText={newPassword !== confirmPassword && confirmPassword !== '' ? 'Şifreler eşleşmiyor' : ''}
                  />
                </Box>
              </Box>
              <Box>
                <Box display="flex" justifyContent="flex-end" mt={2}>
                  <Button 
                    variant="contained" 
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Kaydet'}
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px' }}>
                  <Typography variant="subtitle1" fontWeight="bold">Kullanıcı Adı</Typography>
                  <Typography variant="body1">{user.username}</Typography>
                </Box>
                <Box sx={{ flex: '1 1 300px' }}>
                  <Typography variant="subtitle1" fontWeight="bold">E-posta</Typography>
                  <Typography variant="body1">{user.email}</Typography>
                </Box>
              </Box>
              <Box>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="flex-end" mt={2}>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={logout}
                  >
                    Çıkış Yap
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </TabPanel>

        {/* Ayarlar Tabı */}
        <TabPanel value={tabValue} index={1}>
          {(error || success) && (
            <Alert 
              severity={error ? "error" : "success"} 
              sx={{ mb: 3 }}
              onClose={() => {
                setError(null);
                setSuccess(null);
              }}
            >
              {error || success}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 300px' }}>
                <Typography variant="subtitle1" gutterBottom>Arayüz Teması</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.theme === 'dark'}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        theme: e.target.checked ? 'dark' : 'light' 
                      })}
                    />
                  }
                  label={settings.theme === 'dark' ? 'Karanlık Tema' : 'Aydınlık Tema'}
                />
              </Box>
              
              <Box sx={{ flex: '1 1 300px' }}>
                <Typography variant="subtitle1" gutterBottom>Bildirimler</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notificationsEnabled}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        notificationsEnabled: e.target.checked 
                      })}
                    />
                  }
                  label={settings.notificationsEnabled ? 'Bildirimler Açık' : 'Bildirimler Kapalı'}
                />
              </Box>
            </Box>
            
            <Box>
              <Typography variant="subtitle1" gutterBottom>Tercih Edilen Model</Typography>
              <ToggleButtonGroup
                value={settings.preferredModel}
                exclusive
                onChange={handleModelChange}
                aria-label="preferred model"
                sx={{ mt: 1 }}
              >
                <ToggleButton value="api">
                  ChatGPT API
                </ToggleButton>
                <ToggleButton value="custom">
                  MathChat (Özel Model)
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Box>
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button 
                  variant="contained" 
                  onClick={handleSaveSettings}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Ayarları Kaydet'}
                </Button>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* İstatistikler Tabı */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 250px' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Toplam Sohbetler</Typography>
                  <Typography variant="h3" color="primary">{statistics.totalConversations}</Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: '1 1 250px' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Toplam Mesajlar</Typography>
                  <Typography variant="h3" color="primary">{statistics.totalMessages}</Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: '1 1 250px' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Son Aktivite</Typography>
                  <Typography variant="body1">
                    {new Date(statistics.lastActiveAt).toLocaleString('tr-TR')}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: '1 1 300px' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Soru Türleri</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography>Matematik Soruları:</Typography>
                    <Typography fontWeight="bold">{statistics.mathQuestionsCount}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Genel Sorular:</Typography>
                    <Typography fontWeight="bold">{statistics.generalQuestionsCount}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: '1 1 300px' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Model Kullanımı</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography>ChatGPT API:</Typography>
                    <Typography fontWeight="bold">{statistics.apiModelUses}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>MathChat (Özel Model):</Typography>
                    <Typography fontWeight="bold">{statistics.customModelUses}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default Profile; 