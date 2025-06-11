import React from 'react';
import { 
  Box, 
  ToggleButton, 
  ToggleButtonGroup, 
  Typography, 
  Paper, 
  Chip,
  Alert
} from '@mui/material';
import ApiIcon from '@mui/icons-material/Cloud';
import CustomModelIcon from '@mui/icons-material/Psychology';
import InfoIcon from '@mui/icons-material/Info';

interface ModelSelectorProps {
  selectedModel: 'api' | 'custom' | 'mistral';
  onModelChange: (model: 'api' | 'custom' | 'mistral') => void;
  disabled?: boolean;
  showInfo?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange,
  disabled = false,
  showInfo = true
}) => {
  const handleChange = (
    _: React.MouseEvent<HTMLElement>,
    newModel: 'api' | 'custom' | 'mistral' | null
  ) => {
    if (newModel !== null && !disabled) {
      onModelChange(newModel);
    }
  };

  return (
    <Paper elevation={1} sx={{ p: 1.5, mb: 1 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <InfoIcon color="primary" fontSize="small" />
          <Typography variant="body2" fontWeight="medium">
            Model
          </Typography>
        </Box>
        
        {showInfo && (
                     <Chip 
            label={
              selectedModel === 'api' ? 'ChatGPT' : 
              selectedModel === 'custom' ? 'CodeParrot' : 
              'Mistral 7B'
            } 
             size="small" 
            color={
              selectedModel === 'api' ? 'primary' : 
              selectedModel === 'custom' ? 'secondary' : 
              'warning'
            }
             variant="filled"
           />
        )}
      </Box>
      
      <ToggleButtonGroup
        value={selectedModel}
        exclusive
        onChange={handleChange}
        aria-label="model selection"
        color="primary"
        sx={{ width: '100%' }}
        disabled={disabled}
        size="small"
      >
        <ToggleButton 
          value="api" 
          aria-label="ChatGPT API" 
          sx={{ 
            flex: 1,
            py: 1,
            borderRadius: '6px 0 0 6px !important',
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            },
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <ApiIcon fontSize="small" />
            <Box textAlign="left">
              <Typography variant="caption" fontWeight="medium">
                ChatGPT
              </Typography>
              <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.6rem' }}>
                API Model
              </Typography>
            </Box>
          </Box>
        </ToggleButton>
        
                  <ToggleButton 
            value="custom" 
            aria-label="FLAN-T5 CodeParrot Model" 
          sx={{ 
            flex: 1,
            py: 1,
            borderRadius: '0 !important',
            '&.Mui-selected': {
              backgroundColor: 'secondary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'secondary.dark',
              },
            },
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <CustomModelIcon fontSize="small" />
            <Box textAlign="left">
              <Typography variant="caption" fontWeight="medium">
                CodeParrot
              </Typography>
              <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.6rem' }}>
                Code Model
              </Typography>
            </Box>
          </Box>
        </ToggleButton>

        <ToggleButton 
          value="mistral" 
          aria-label="Mistral 7B Model" 
          sx={{ 
            flex: 1,
            py: 1,
            borderRadius: '0 6px 6px 0 !important',
            '&.Mui-selected': {
              backgroundColor: 'warning.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'warning.dark',
              },
            },
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <CustomModelIcon fontSize="small" />
            <Box textAlign="left">
              <Typography variant="caption" fontWeight="medium">
                Mistral 7B
              </Typography>
              <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.6rem' }}>
                Local Model
              </Typography>
            </Box>
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>
    </Paper>
  );
};

export default ModelSelector; 