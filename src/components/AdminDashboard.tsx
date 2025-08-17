import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Collapse,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Delete, Edit, Add, Dashboard, History, PlayArrow, CheckCircle, Error, People, Settings, Language, Tune, Star } from '@mui/icons-material';
import { User, LLMConfig, SystemSetting } from '../types';
import { authAPI, configAPI, systemSettingsAPI } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import { useTranslation } from '../hooks/useTranslation';
import { SystemMetrics } from './SystemMetrics';
import { ChatHistoryViewer } from './ChatHistoryViewer';
import { responsive } from '../theme/responsive';

interface LLMConfigForm extends Omit<LLMConfig, 'temperature' | 'maxTokens' | 'repetitionPenalty'> {
  temperature: string | number;
  maxTokens: string | number;
  repetitionPenalty: string | number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ 
          p: { xs: 2, sm: 3 },
          [responsive.mobile]: {
            p: 1.5
          }
        }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const AdminDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
  const { t } = useTranslation();
  const [usersWithUsage, setUsersWithUsage] = useState<Array<User & {
    tokenUsage: {
      totalTokens: number;
      inputTokens: number;
      outputTokens: number;
      totalSessions: number;
      lastUsage: Date | null;
    }
  }>>([]);
  const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<LLMConfigForm | null>(null);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  });

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [newConfig, setNewConfig] = useState({
    name: '',
    type: 'openai' as 'openai' | 'ollama',
    apiKey: '',
    endpoint: 'https://api.openai.com/v1',
    model: '',
    temperature: '0.7',
    maxTokens: '1000',
    systemPrompt: '',
    repetitionPenalty: '1.0',
    isEnabled: false,
    isDefault: false,
  });

  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingConfig, setTestingConfig] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; response?: string } | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);

  useEffect(() => {
    fetchUsersWithUsage();
    fetchLLMConfigs();
    fetchSystemSettings();
  }, []);

  const fetchUsersWithUsage = async () => {
    try {
      const fetchedUsersWithUsage = await authAPI.getUsersWithUsage();
      setUsersWithUsage(fetchedUsersWithUsage);
    } catch (error) {
      console.error('Failed to fetch users with usage:', error);
    }
  };

  const fetchLLMConfigs = async () => {
    try {
      const fetchedConfigs = await configAPI.getConfigs();
      setLlmConfigs(fetchedConfigs);
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const settings = await systemSettingsAPI.getAllSettings();
      setSystemSettings(settings);
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
    }
  };

  const handleSettingChange = async (settingKey: string, value: any) => {
    try {
      await systemSettingsAPI.updateSetting(settingKey, value);
      
      // Update local state
      setSystemSettings(prev => 
        prev.map(setting => 
          setting.setting_key === settingKey 
            ? { ...setting, setting_value: value }
            : setting
        )
      );
      
      // If language was changed, update it immediately
      if (settingKey === 'system_language') {
        await changeLanguage(value);
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      alert('Failed to update setting');
    }
  };

  const fetchModels = async () => {
    const currentConfig = selectedConfig || newConfig;
    
    if (currentConfig.type !== 'openai') {
      return;
    }

    // Allow fetching models without API key for local services
    if (!currentConfig.apiKey && !currentConfig.endpoint) {
      alert('Please provide either an API key (for OpenAI/compatible APIs) or an endpoint URL (for local services) to fetch models');
      return;
    }

    setFetchingModels(true);
    try {
      const models = await configAPI.fetchModels(currentConfig.apiKey || '', currentConfig.endpoint);
      setAvailableModels(models);
    } catch (error: any) {
      console.error('Failed to fetch models:', error);
      alert(`Failed to fetch models: ${error.response?.data?.error || error.message}`);
    } finally {
      setFetchingModels(false);
    }
  };

  const testConfiguration = async () => {
    const currentConfig = selectedConfig || newConfig;
    
    if (!currentConfig.model) {
      alert('Please select or enter a model name first');
      return;
    }

    if (currentConfig.type === 'openai' && !currentConfig.apiKey) {
      // Allow testing without API key for demo mode
    } else if (currentConfig.type === 'ollama' && !currentConfig.endpoint) {
      alert('Please enter an endpoint URL for Ollama configuration');
      return;
    }

    setTestingConfig(true);
    setTestResult(null);
    
    try {
      const result = await configAPI.testConfig({
        type: currentConfig.type,
        api_key: currentConfig.apiKey,
        endpoint: currentConfig.endpoint,
        model: currentConfig.model,
        temperature: typeof currentConfig.temperature === 'string' ? parseFloat(currentConfig.temperature) : currentConfig.temperature,
        max_tokens: typeof currentConfig.maxTokens === 'string' ? parseInt(currentConfig.maxTokens) : currentConfig.maxTokens,
      });
      
      setTestResult({
        success: result.success,
        message: result.message || 'Test completed',
        response: result.response,
      });
    } catch (error: any) {
      console.error('Failed to test config:', error);
      setTestResult({
        success: false,
        message: error.response?.data?.error || error.message || 'Test failed',
      });
    } finally {
      setTestingConfig(false);
    }
  };

  const userColumns: GridColDef[] = [
    { field: 'username', headerName: t('admin.users.username'), width: 150 },
    { field: 'email', headerName: t('admin.users.email'), width: 200 },
    { field: 'role', headerName: t('admin.users.role'), width: 100 },
    { 
      field: 'totalTokens', 
      headerName: 'Total Tokens', 
      width: 120,
      valueGetter: (value, row) => row.tokenUsage?.totalTokens || 0,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 1000 ? 'warning.main' : 'text.primary' }}>
          {params.value.toLocaleString()}
        </Box>
      )
    },
    { 
      field: 'totalSessions', 
      headerName: 'Sessions', 
      width: 100,
      valueGetter: (value, row) => row.tokenUsage?.totalSessions || 0
    },
    { 
      field: 'lastUsage', 
      headerName: 'Last Usage', 
      width: 150, 
      type: 'dateTime',
      valueGetter: (value, row) => row.tokenUsage?.lastUsage ? new Date(row.tokenUsage.lastUsage) : null
    },
    { 
      field: 'createdAt', 
      headerName: t('admin.users.created'), 
      width: 150, 
      type: 'dateTime',
      valueGetter: (value) => new Date(value as string)
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          onClick={() => {
            setSelectedUser(params.row);
            setUserDialogOpen(true);
          }}
        />,
        <GridActionsCellItem
          icon={<Settings />}
          label="Set Password"
          onClick={() => {
            setSelectedUserForPassword(params.row);
            setPasswordDialogOpen(true);
          }}
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Delete"
          onClick={async () => {
            if (window.confirm('Are you sure you want to delete this user?')) {
              try {
                await authAPI.deleteUser(params.row.id);
                await fetchUsersWithUsage();
              } catch (error) {
                console.error('Failed to delete user:', error);
              }
            }
          }}
        />,
      ],
    },
  ];

  const configColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'type', headerName: 'Type', width: 100 },
    { field: 'model', headerName: 'Model', width: 150 },
    { field: 'temperature', headerName: 'Temperature', width: 120 },
    { field: 'maxTokens', headerName: 'Max Tokens', width: 120 },
    { field: 'isEnabled', headerName: 'Enabled', width: 100, type: 'boolean' },
    { 
      field: 'isDefault', 
      headerName: 'Default', 
      width: 100, 
      type: 'boolean',
      renderCell: (params) => (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: params.value ? 'success.main' : 'text.secondary'
        }}>
          {params.value ? '✓ Default' : ''}
        </Box>
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          onClick={() => {
            setSelectedConfig({
              ...params.row, 
              apiKey: '',
              systemPrompt: params.row.systemPrompt || '',
              temperature: params.row.temperature?.toString() || '0.7',
              maxTokens: params.row.maxTokens?.toString() || '1000',
              repetitionPenalty: params.row.repetitionPenalty?.toString() || '1.0'
            });
            setConfigDialogOpen(true);
          }}
        />,
        <GridActionsCellItem
          icon={<Star />}
          label="Set as Default"
          disabled={params.row.isDefault || !params.row.isEnabled}
          onClick={async () => {
            if (window.confirm('Set this LLM as the default for new users?')) {
              try {
                await configAPI.setDefault(params.row.id);
                await fetchLLMConfigs();
              } catch (error) {
                console.error('Failed to set default config:', error);
                alert('Failed to set as default');
              }
            }
          }}
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Delete"
          onClick={async () => {
            if (window.confirm('Are you sure you want to delete this LLM configuration?')) {
              try {
                await configAPI.deleteConfig(params.row.id);
                await fetchLLMConfigs();
              } catch (error) {
                console.error('Failed to delete config:', error);
                alert('Failed to delete configuration');
              }
            }
          }}
        />,
      ],
    },
  ];

  const handleUserSave = async () => {
    try {
      if (selectedUser) {
        await authAPI.updateUser(selectedUser.id, {
          username: selectedUser.username,
          email: selectedUser.email,
          role: selectedUser.role,
        });
      } else {
        await authAPI.createUser(newUser);
      }
      await fetchUsersWithUsage();
      setUserDialogOpen(false);
      setSelectedUser(null);
      setNewUser({ username: '', email: '', password: '', role: 'user' });
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleConfigSave = async () => {
    try {
      if (selectedConfig) {
        await configAPI.updateConfig(selectedConfig.id, {
          name: selectedConfig.name,
          type: selectedConfig.type,
          apiKey: selectedConfig.apiKey,
          endpoint: selectedConfig.endpoint,
          model: selectedConfig.model,
          temperature: typeof selectedConfig.temperature === 'string' ? parseFloat(selectedConfig.temperature) : selectedConfig.temperature,
          maxTokens: typeof selectedConfig.maxTokens === 'string' ? parseInt(selectedConfig.maxTokens) : selectedConfig.maxTokens,
          systemPrompt: selectedConfig.systemPrompt,
          repetitionPenalty: typeof selectedConfig.repetitionPenalty === 'string' ? parseFloat(selectedConfig.repetitionPenalty) : selectedConfig.repetitionPenalty,
          isEnabled: selectedConfig.isEnabled,
          isDefault: selectedConfig.isDefault,
        });
      } else {
        await configAPI.createConfig({
          name: newConfig.name,
          type: newConfig.type,
          apiKey: newConfig.apiKey,
          endpoint: newConfig.endpoint,
          model: newConfig.model,
          temperature: typeof newConfig.temperature === 'string' && newConfig.temperature !== '' ? parseFloat(newConfig.temperature) : 0.7,
          maxTokens: typeof newConfig.maxTokens === 'string' && newConfig.maxTokens !== '' ? parseInt(newConfig.maxTokens) : 1000,
          systemPrompt: newConfig.systemPrompt,
          repetitionPenalty: typeof newConfig.repetitionPenalty === 'string' && newConfig.repetitionPenalty !== '' ? parseFloat(newConfig.repetitionPenalty) : 1.0,
          isEnabled: newConfig.isEnabled,
          isDefault: newConfig.isDefault,
        });
      }
      await fetchLLMConfigs();
      setConfigDialogOpen(false);
      setSelectedConfig(null);
      setAvailableModels([]);
      setTestResult(null);
      setNewConfig({
        name: '',
        type: 'openai',
        apiKey: '',
        endpoint: 'https://api.openai.com/v1',
        model: '',
        temperature: '0.7',
        maxTokens: '1000',
        systemPrompt: '',
        repetitionPenalty: '1.0',
        isEnabled: false,
        isDefault: false,
      });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  return (
    <>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
      <Box sx={{ 
        background: theme.custom.gradients.primary,
        borderRadius: theme.custom.borderRadius.large,
        p: { xs: 2, sm: 3 },
        mb: 3,
        color: 'white'
      }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          gutterBottom
          sx={{ 
            fontWeight: 700,
            textAlign: { xs: 'center', sm: 'left' }
          }}
        >
          {t('admin.title')}
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            opacity: 0.9,
            textAlign: { xs: 'center', sm: 'left' }
          }}
        >
          {t('admin.subtitle')}
        </Typography>
      </Box>

      <Card sx={{ 
        borderRadius: theme.custom.borderRadius.large,
        boxShadow: theme.custom.shadows.card,
        overflow: 'hidden'
      }}>
        <CardContent sx={{ p: 0 }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, newValue) => setTabValue(newValue)}
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons={isMobile ? "auto" : false}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              '& .MuiTab-root': {
                minWidth: { xs: 120, sm: 160 },
                fontWeight: 500,
                textTransform: 'none',
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
          >
            <Tab 
              icon={<Dashboard />} 
              label={isMobile ? t('admin.systemOverview') : t('admin.systemOverview')}
              iconPosition="start"
            />
            <Tab 
              icon={<History />} 
              label={isMobile ? t('admin.chatHistory') : t('admin.chatHistory')}
              iconPosition="start"
            />
            <Tab 
              icon={<People />}
              label={isMobile ? t('admin.userManagement') : t('admin.userManagement')}
              iconPosition="start"
            />
            <Tab 
              icon={<Settings />}
              label={isMobile ? t('admin.systemSettings') : t('admin.systemSettings')}
              iconPosition="start"
            />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <SystemMetrics />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <ChatHistoryViewer />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              mb: 3
            }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t('admin.users.title')}
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setUserDialogOpen(true)}
                sx={{ 
                  borderRadius: theme.custom.borderRadius.medium,
                  px: 3,
                  py: 1.5
                }}
              >
                {t('admin.users.addUser')}
              </Button>
            </Box>
            <Box sx={{ 
              height: { xs: 400, sm: 500 },
              '& .MuiDataGrid-root': {
                border: 'none',
                borderRadius: theme.custom.borderRadius.medium,
                overflow: 'hidden'
              }
            }}>
              <DataGrid
                rows={usersWithUsage}
                columns={userColumns}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableRowSelectionOnClick
                sx={{
                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: 'rgba(99, 102, 241, 0.05)',
                    fontWeight: 600
                  }
                }}
              />
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {/* System Settings */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                {t('admin.settings.title')}
              </Typography>
              
              <Box sx={{ 
                display: 'grid', 
                gap: 3,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }
              }}>
                {/* Language Setting */}
                <Card sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    <Language sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('admin.settings.language')}
                  </Typography>
                  <FormControl fullWidth>
                    <Select
                      value={currentLanguage}
                      onChange={(e) => handleSettingChange('system_language', e.target.value)}
                    >
                      {supportedLanguages.map((lang) => (
                        <MenuItem key={lang.code} value={lang.code}>
                          {lang.nativeName} ({lang.name})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Card>

                {/* Body Information Setting */}
                {systemSettings.filter(s => s.setting_key === 'require_user_body_info').map((setting) => (
                  <Card key={setting.id} sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      {t('admin.settings.requireBodyInfo')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('admin.settings.requireBodyInfoDesc')}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={setting.setting_value}
                          onChange={(e) => handleSettingChange(setting.setting_key, e.target.checked)}
                        />
                      }
                      label={setting.setting_value ? 'Enabled' : 'Disabled'}
                    />
                  </Card>
                ))}

                {/* Other Settings */}
                {systemSettings.filter(s => s.setting_key !== 'system_language' && s.setting_key !== 'require_user_body_info').map((setting) => (
                  <Card key={setting.id} sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      {setting.description || setting.setting_key}
                    </Typography>
                    {setting.setting_type === 'boolean' ? (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={setting.setting_value}
                            onChange={(e) => handleSettingChange(setting.setting_key, e.target.checked)}
                          />
                        }
                        label={setting.setting_value ? 'Enabled' : 'Disabled'}
                      />
                    ) : setting.setting_type === 'number' ? (
                      <TextField
                        type="number"
                        fullWidth
                        value={setting.setting_value}
                        onChange={(e) => handleSettingChange(setting.setting_key, parseFloat(e.target.value))}
                      />
                    ) : (
                      <TextField
                        fullWidth
                        value={setting.setting_value}
                        onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                      />
                    )}
                  </Card>
                ))}
              </Box>
            </Box>

            {/* LLM Configuration under System Settings */}
            <Box sx={{ mt: 6 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                <Tune sx={{ mr: 1, verticalAlign: 'middle' }} />
                {t('admin.llm.title')}
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
                mb: 3
              }}>
                <Typography variant="subtitle1" color="text.secondary">
                  Manage AI model configurations
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setConfigDialogOpen(true)}
                  sx={{ 
                    borderRadius: theme.custom.borderRadius.medium,
                    px: 3,
                    py: 1.5
                  }}
                >
                  {t('admin.llm.addConfig')}
                </Button>
              </Box>
              
              <Box sx={{ 
                height: { xs: 400, sm: 500 },
                '& .MuiDataGrid-root': {
                  border: 'none',
                  borderRadius: theme.custom.borderRadius.medium,
                  overflow: 'hidden'
                }
              }}>
                <DataGrid
                  rows={llmConfigs}
                  columns={configColumns}
                  pageSizeOptions={[5, 10, 25]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  disableRowSelectionOnClick
                  sx={{
                    '& .MuiDataGrid-cell': {
                      borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: 'rgba(99, 102, 241, 0.05)',
                      fontWeight: 600
                    }
                  }}
                />
              </Box>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>
      </Container>

      <Dialog 
        open={userDialogOpen} 
        onClose={() => setUserDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: theme.custom.borderRadius.large,
            boxShadow: theme.custom.shadows.card
          }
        }}
      >
        <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={selectedUser?.username || newUser.username}
            onChange={(e) => selectedUser 
              ? setSelectedUser({...selectedUser, username: e.target.value})
              : setNewUser({...newUser, username: e.target.value})
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={selectedUser?.email || newUser.email}
            onChange={(e) => selectedUser 
              ? setSelectedUser({...selectedUser, email: e.target.value})
              : setNewUser({...newUser, email: e.target.value})
            }
            margin="normal"
          />
          {!selectedUser && (
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              margin="normal"
            />
          )}
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={selectedUser?.role || newUser.role}
              onChange={(e) => selectedUser 
                ? setSelectedUser({...selectedUser, role: e.target.value as 'admin' | 'user'})
                : setNewUser({...newUser, role: e.target.value as 'admin' | 'user'})
              }
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUserSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={configDialogOpen} 
        onClose={() => setConfigDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: theme.custom.borderRadius.large,
            boxShadow: theme.custom.shadows.card
          }
        }}
      >
        <DialogTitle>{selectedConfig ? 'Edit Configuration' : 'Add New Configuration'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Configuration Name"
            value={selectedConfig?.name || newConfig.name}
            onChange={(e) => selectedConfig 
              ? setSelectedConfig({...selectedConfig, name: e.target.value})
              : setNewConfig({...newConfig, name: e.target.value})
            }
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={selectedConfig?.type || newConfig.type}
              onChange={(e) => selectedConfig 
                ? setSelectedConfig({...selectedConfig, type: e.target.value as 'openai' | 'ollama'})
                : setNewConfig({...newConfig, type: e.target.value as 'openai' | 'ollama'})
              }
            >
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="ollama">Ollama</MenuItem>
            </Select>
          </FormControl>
          {(selectedConfig?.type === 'openai' || newConfig.type === 'openai') && (
            <>
              <TextField
                fullWidth
                label="API Endpoint URL"
                value={selectedConfig?.endpoint || newConfig.endpoint || 'https://api.openai.com/v1'}
                onChange={(e) => selectedConfig 
                  ? setSelectedConfig({...selectedConfig, endpoint: e.target.value})
                  : setNewConfig({...newConfig, endpoint: e.target.value})
                }
                margin="normal"
                helperText="For OpenAI use: https://api.openai.com/v1, for other providers use their compatible endpoint"
              />
              <TextField
                fullWidth
                label="API Key"
                type="password"
                value={selectedConfig ? (selectedConfig.apiKey ? '••••••••••••••••••••' : '') : newConfig.apiKey}
                onChange={(e) => selectedConfig 
                  ? setSelectedConfig({...selectedConfig, apiKey: e.target.value})
                  : setNewConfig({...newConfig, apiKey: e.target.value})
                }
                margin="normal"
                placeholder={selectedConfig ? "Enter new API key (leave blank to keep current)" : "Enter your API key"}
                helperText={selectedConfig ? "For security, the current API key is hidden. Enter a new key to update it." : undefined}
              />
            </>
          )}
          {(selectedConfig?.type === 'ollama' || newConfig.type === 'ollama') && (
            <TextField
              fullWidth
              label="Endpoint URL"
              value={selectedConfig?.endpoint || newConfig.endpoint}
              onChange={(e) => selectedConfig 
                ? setSelectedConfig({...selectedConfig, endpoint: e.target.value})
                : setNewConfig({...newConfig, endpoint: e.target.value})
              }
              margin="normal"
            />
          )}
          {(selectedConfig?.type === 'openai' || newConfig.type === 'openai') ? (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Button
                  variant="outlined"
                  onClick={fetchModels}
                  disabled={fetchingModels || !((selectedConfig?.apiKey || newConfig.apiKey) || (selectedConfig?.endpoint || newConfig.endpoint))}
                  startIcon={fetchingModels ? <CircularProgress size={20} /> : null}
                >
                  {fetchingModels ? 'Fetching...' : 'Fetch Models'}
                </Button>
                <Typography variant="body2" color="textSecondary">
                  Click to load available models (requires API key or local endpoint)
                </Typography>
              </Box>
              
              {availableModels.length > 0 ? (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={selectedConfig?.model || newConfig.model}
                    onChange={(e) => selectedConfig 
                      ? setSelectedConfig({...selectedConfig, model: e.target.value})
                      : setNewConfig({...newConfig, model: e.target.value})
                    }
                    label="Model"
                  >
                    {availableModels.map((model) => (
                      <MenuItem key={model.id} value={model.id}>
                        {model.id} ({model.owned_by})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  fullWidth
                  label="Model"
                  value={selectedConfig?.model || newConfig.model}
                  onChange={(e) => selectedConfig 
                    ? setSelectedConfig({...selectedConfig, model: e.target.value})
                    : setNewConfig({...newConfig, model: e.target.value})
                  }
                  margin="normal"
                  helperText="Enter model name manually or fetch available models"
                />
              )}
            </Box>
          ) : (
            <TextField
              fullWidth
              label="Model"
              value={selectedConfig?.model || newConfig.model}
              onChange={(e) => selectedConfig 
                ? setSelectedConfig({...selectedConfig, model: e.target.value})
                : setNewConfig({...newConfig, model: e.target.value})
              }
              margin="normal"
            />
          )}
          <TextField
            fullWidth
            label="Temperature"
            type="number"
            inputProps={{ min: 0, max: 2, step: 0.1 }}
            value={selectedConfig?.temperature?.toString() || newConfig.temperature}
            onChange={(e) => selectedConfig 
              ? setSelectedConfig({...selectedConfig, temperature: e.target.value})
              : setNewConfig({...newConfig, temperature: e.target.value})
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Max Tokens"
            type="number"
            value={selectedConfig?.maxTokens?.toString() || newConfig.maxTokens}
            onChange={(e) => selectedConfig 
              ? setSelectedConfig({...selectedConfig, maxTokens: e.target.value})
              : setNewConfig({...newConfig, maxTokens: e.target.value})
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="System Prompt"
            multiline
            rows={3}
            value={selectedConfig?.systemPrompt || newConfig.systemPrompt}
            onChange={(e) => selectedConfig 
              ? setSelectedConfig({...selectedConfig, systemPrompt: e.target.value})
              : setNewConfig({...newConfig, systemPrompt: e.target.value})
            }
            margin="normal"
            helperText="Optional system prompt to set the AI's behavior and context"
          />
          <TextField
            fullWidth
            label="Repetition Penalty"
            type="number"
            inputProps={{ min: 0.1, max: 2.0, step: 0.1 }}
            value={selectedConfig?.repetitionPenalty?.toString() || newConfig.repetitionPenalty}
            onChange={(e) => selectedConfig 
              ? setSelectedConfig({...selectedConfig, repetitionPenalty: e.target.value})
              : setNewConfig({...newConfig, repetitionPenalty: e.target.value})
            }
            margin="normal"
            helperText="Controls repetition in responses (1.0 = no penalty, higher values reduce repetition)"
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={selectedConfig?.isEnabled || newConfig.isEnabled}
                  onChange={(e) => selectedConfig 
                    ? setSelectedConfig({...selectedConfig, isEnabled: e.target.checked})
                    : setNewConfig({...newConfig, isEnabled: e.target.checked})
                  }
                />
              }
              label="Enable Configuration"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={selectedConfig?.isDefault || newConfig.isDefault}
                  onChange={(e) => selectedConfig 
                    ? setSelectedConfig({...selectedConfig, isDefault: e.target.checked})
                    : setNewConfig({...newConfig, isDefault: e.target.checked})
                  }
                />
              }
              label="Set as Default"
            />
          </Box>
          
          {/* Test Configuration Section */}
          <Box sx={{ 
            mt: 3, 
            p: 3, 
            border: '1px solid rgba(99, 102, 241, 0.2)', 
            borderRadius: theme.custom.borderRadius.medium,
            backgroundColor: 'rgba(99, 102, 241, 0.02)'
          }}>
            <Typography variant="h6" gutterBottom>
              Test Configuration
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Test the configuration by sending a sample message to verify connectivity and API credentials.
            </Typography>
            
            <Button
              variant="outlined"
              onClick={testConfiguration}
              disabled={testingConfig || !((selectedConfig?.model || newConfig.model))}
              startIcon={testingConfig ? <CircularProgress size={20} /> : <PlayArrow />}
              sx={{ mb: 2 }}
            >
              {testingConfig ? 'Testing...' : 'Test Configuration'}
            </Button>
            
            <Collapse in={testResult !== null}>
              {testResult && (
                <Alert 
                  severity={testResult.success ? 'success' : 'error'}
                  icon={testResult.success ? <CheckCircle /> : <Error />}
                  sx={{ mt: 1 }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {testResult.message}
                    </Typography>
                    {testResult.response && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        AI Response: "{testResult.response}"
                      </Typography>
                    )}
                  </Box>
                </Alert>
              )}
            </Collapse>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfigSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={passwordDialogOpen} 
        onClose={() => {
          setPasswordDialogOpen(false);
          setSelectedUserForPassword(null);
          setNewPassword('');
        }} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: theme.custom.borderRadius.large,
            boxShadow: theme.custom.shadows.card
          }
        }}
      >
        <DialogTitle>Set Password for {selectedUserForPassword?.username}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            helperText="Password must be at least 6 characters long"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPasswordDialogOpen(false);
            setSelectedUserForPassword(null);
            setNewPassword('');
          }}>Cancel</Button>
          <Button 
            onClick={async () => {
              try {
                if (!selectedUserForPassword || !newPassword) return;
                await authAPI.setUserPassword(selectedUserForPassword.id, newPassword);
                setPasswordDialogOpen(false);
                setSelectedUserForPassword(null);
                setNewPassword('');
                alert('Password updated successfully');
              } catch (error: any) {
                alert(error.message || 'Failed to update password');
              }
            }} 
            variant="contained"
            disabled={newPassword.length < 6}
          >
            Set Password
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};