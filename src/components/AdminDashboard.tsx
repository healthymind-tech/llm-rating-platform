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
import { Delete, Edit, Add, Dashboard, History, PlayArrow, CheckCircle, Error, People, Settings } from '@mui/icons-material';
import { User, LLMConfig } from '../types';
import { authAPI, configAPI } from '../services/api';
import { SystemMetrics } from './SystemMetrics';
import { ChatHistoryViewer } from './ChatHistoryViewer';
import { responsive } from '../theme/responsive';

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
  const [users, setUsers] = useState<User[]>([]);
  const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<LLMConfig | null>(null);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  });

  const [newConfig, setNewConfig] = useState({
    name: '',
    type: 'openai' as 'openai' | 'ollama',
    apiKey: '',
    endpoint: 'https://api.openai.com/v1',
    model: '',
    temperature: 0.7,
    maxTokens: 2048,
    isActive: false,
  });

  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingConfig, setTestingConfig] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; response?: string } | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchLLMConfigs();
  }, []);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await authAPI.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
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

  const fetchModels = async () => {
    const currentConfig = selectedConfig || newConfig;
    
    if (currentConfig.type !== 'openai' || !currentConfig.apiKey) {
      return;
    }

    setFetchingModels(true);
    try {
      const models = await configAPI.fetchModels(currentConfig.apiKey, currentConfig.endpoint);
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
        temperature: currentConfig.temperature,
        max_tokens: currentConfig.maxTokens,
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
    { field: 'username', headerName: 'Username', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'role', headerName: 'Role', width: 100 },
    { 
      field: 'createdAt', 
      headerName: 'Created', 
      width: 150, 
      type: 'dateTime',
      valueGetter: (value) => new Date(value as string)
    },
    { 
      field: 'lastLogin', 
      headerName: 'Last Login', 
      width: 150, 
      type: 'dateTime',
      valueGetter: (value) => value ? new Date(value as string) : null
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
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
          icon={<Delete />}
          label="Delete"
          onClick={async () => {
            try {
              await authAPI.deleteUser(params.row.id);
              await fetchUsers();
            } catch (error) {
              console.error('Failed to delete user:', error);
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
    { field: 'isActive', headerName: 'Active', width: 100, type: 'boolean' },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          onClick={() => {
            setSelectedConfig({...params.row, apiKey: ''});
            setConfigDialogOpen(true);
          }}
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Delete"
          onClick={async () => {
            try {
              await configAPI.deleteConfig(params.row.id);
              await fetchLLMConfigs();
            } catch (error) {
              console.error('Failed to delete config:', error);
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
      await fetchUsers();
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
          temperature: selectedConfig.temperature,
          maxTokens: selectedConfig.maxTokens,
          isActive: selectedConfig.isActive,
        });
      } else {
        await configAPI.createConfig({
          name: newConfig.name,
          type: newConfig.type,
          apiKey: newConfig.apiKey,
          endpoint: newConfig.endpoint,
          model: newConfig.model,
          temperature: newConfig.temperature,
          maxTokens: newConfig.maxTokens,
          isActive: newConfig.isActive,
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
        temperature: 0.7,
        maxTokens: 2048,
        isActive: false,
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
          Admin Dashboard
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            opacity: 0.9,
            textAlign: { xs: 'center', sm: 'left' }
          }}
        >
          Manage users, configurations, and monitor system performance
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
              label={isMobile ? "Overview" : "System Overview"}
              iconPosition="start"
            />
            <Tab 
              icon={<History />} 
              label={isMobile ? "History" : "Chat History"}
              iconPosition="start"
            />
            <Tab 
              icon={<People />}
              label={isMobile ? "Users" : "User Management"}
              iconPosition="start"
            />
            <Tab 
              icon={<Settings />}
              label={isMobile ? "Config" : "LLM Configuration"}
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
                Manage Users
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
                Add User
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
                rows={users}
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
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              mb: 3
            }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                LLM Configurations
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
                Add Configuration
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
                  disabled={fetchingModels || !(selectedConfig?.apiKey || newConfig.apiKey)}
                  startIcon={fetchingModels ? <CircularProgress size={20} /> : null}
                >
                  {fetchingModels ? 'Fetching...' : 'Fetch Models'}
                </Button>
                <Typography variant="body2" color="textSecondary">
                  Click to load available models from API
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
            value={selectedConfig?.temperature || newConfig.temperature}
            onChange={(e) => selectedConfig 
              ? setSelectedConfig({...selectedConfig, temperature: parseFloat(e.target.value)})
              : setNewConfig({...newConfig, temperature: parseFloat(e.target.value)})
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Max Tokens"
            type="number"
            value={selectedConfig?.maxTokens || newConfig.maxTokens}
            onChange={(e) => selectedConfig 
              ? setSelectedConfig({...selectedConfig, maxTokens: parseInt(e.target.value)})
              : setNewConfig({...newConfig, maxTokens: parseInt(e.target.value)})
            }
            margin="normal"
          />
          <FormControlLabel
            control={
              <Switch
                checked={selectedConfig?.isActive || newConfig.isActive}
                onChange={(e) => selectedConfig 
                  ? setSelectedConfig({...selectedConfig, isActive: e.target.checked})
                  : setNewConfig({...newConfig, isActive: e.target.checked})
                }
              />
            }
            label="Active Configuration"
          />
          
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
    </>
  );
};