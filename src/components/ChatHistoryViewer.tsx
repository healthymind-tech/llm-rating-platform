import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Pagination,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Autocomplete,
  Avatar,
  useTheme,
  useMediaQuery,
  Stack,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Visibility,
  Person,
  SmartToy,
  Search,
  ThumbUp,
  ThumbDown,
  FilterList,
  Clear,
  ChatBubble,
  Group,
  Message,
  ExpandMore,
  ExpandLess,
  Download,
  Description,
  Code,
  Storage,
} from '@mui/icons-material';
import { metricsAPI } from '../services/api';
import { ImageModal } from './ImageModal';

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
      id={`chat-tabpanel-${index}`}
      aria-labelledby={`chat-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const ChatHistoryViewer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportType, setExportType] = useState<'sessions' | 'messages' | null>(null);
  const [exporting, setExporting] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    username: '',
    role: '',
    rating: '',
    dateFrom: '',
    dateTo: '',
    messageContent: '',
    modelName: '',
  });

  const [sessionFilters, setSessionFilters] = useState({
    username: '',
    dateFrom: '',
    dateTo: '',
    modelName: '',
  });

  useEffect(() => {
    if (tabValue === 0) {
      fetchSessions();
    } else {
      fetchChatHistory();
    }
  }, [tabValue, page]);

  useEffect(() => {
    // Fetch users for dropdowns
    const fetchUsers = async () => {
      try {
        const userList = await metricsAPI.getUsers();
        setUsers(userList);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const limit = 10;
      const offset = (page - 1) * limit;
      
      // Filter out empty values
      const activeFilters = Object.entries(sessionFilters).reduce((acc, [key, value]) => {
        if (value && value.trim() !== '') {
          acc[key as keyof typeof sessionFilters] = value;
        }
        return acc;
      }, {} as Partial<typeof sessionFilters>);

      const data = await metricsAPI.getChatSessions(limit, offset, Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
      setSessions(data.sessions);
      setTotalPages(Math.ceil(data.totalCount / limit));
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatHistory = async () => {
    setLoading(true);
    try {
      const limit = 20;
      const offset = (page - 1) * limit;
      
      // Filter out empty values
      const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value && value.trim() !== '') {
          acc[key as keyof typeof filters] = value;
        }
        return acc;
      }, {} as Partial<typeof filters>);

      const data = await metricsAPI.getChatHistory(limit, offset, Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
      setChatHistory(data.messages);
      setTotalPages(Math.ceil(data.totalCount / limit));
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSession = async (session: any) => {
    try {
      const messages = await metricsAPI.getSessionMessages(session.id);
      setSessionMessages(messages);
      setSelectedSession(session);
      setDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch session messages:', error);
    }
  };

  const handleFilterChange = (filterType: 'messages' | 'sessions', field: string, value: string) => {
    if (filterType === 'messages') {
      const newFilters = { ...filters, [field]: value };
      
      // Clear rating and model name if role is changed to 'user' (only assistant messages can be rated/have models)
      if (field === 'role' && value === 'user') {
        newFilters.rating = '';
        newFilters.modelName = '';
      }
      
      setFilters(newFilters);
    } else {
      setSessionFilters(prev => ({ ...prev, [field]: value }));
    }
  };

  const applyFilters = () => {
    setPage(1);
    if (tabValue === 0) {
      fetchSessions();
    } else {
      fetchChatHistory();
    }
  };

  const handleImageClick = (imageSrc: string) => {
    setSelectedImageSrc(imageSrc);
    setImageModalOpen(true);
  };

  const clearFilters = () => {
    if (tabValue === 0) {
      setSessionFilters({
        username: '',
        dateFrom: '',
        dateTo: '',
        modelName: '',
      });
    } else {
      setFilters({
        username: '',
        role: '',
        rating: '',
        dateFrom: '',
        dateTo: '',
        messageContent: '',
        modelName: '',
      });
    }
    setPage(1);
    setTimeout(() => {
      if (tabValue === 0) {
        fetchSessions();
      } else {
        fetchChatHistory();
      }
    }, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleExportClick = (event: React.MouseEvent<HTMLElement>, type: 'sessions' | 'messages') => {
    setExportMenuAnchor(event.currentTarget);
    setExportType(type);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
    setExportType(null);
  };

  const handleExport = async (format: 'json' | 'csv' | 'xml') => {
    try {
      setExporting(true);
      handleExportClose();
      
      let response;
      let filename;
      
      if (exportType === 'sessions') {
        // Filter out empty values for sessions
        const activeFilters = Object.entries(sessionFilters).reduce((acc, [key, value]) => {
          if (value && value.trim() !== '') {
            acc[key as keyof typeof sessionFilters] = value;
          }
          return acc;
        }, {} as Partial<typeof sessionFilters>);
        
        response = await metricsAPI.exportChatSessions(format, activeFilters);
        filename = `chat-sessions-${new Date().toISOString().split('T')[0]}.${format}`;
      } else {
        // Filter out empty values for messages
        const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
          if (value && value.trim() !== '') {
            acc[key as keyof typeof filters] = value;
          }
          return acc;
        }, {} as Partial<typeof filters>);
        
        response = await metricsAPI.exportChatMessages(format, activeFilters);
        filename = `chat-messages-${new Date().toISOString().split('T')[0]}.${format}`;
      }
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      // You could add a toast notification here
    } finally {
      setExporting(false);
    }
  };

  const MessageBubble: React.FC<{ message: any }> = ({ message }) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        mb: 2,
        flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
      }}
    >
      <Box
        sx={{
          mr: message.role === 'user' ? 0 : 1,
          ml: message.role === 'user' ? 1 : 0,
        }}
      >
        {message.role === 'user' ? (
          <Person sx={{ color: '#1976d2' }} />
        ) : (
          <SmartToy sx={{ color: '#2e7d32' }} />
        )}
      </Box>
      <Paper
        sx={{
          p: 2,
          maxWidth: '70%',
          bgcolor: message.role === 'user' ? '#e3f2fd' : '#f3e5f5',
        }}
      >
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>{message.role === 'user' ? 'User' : 'Assistant'}</strong>
        </Typography>
        {/* Display images if present */}
        {message.images && message.images.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box 
              sx={{ 
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                maxWidth: 300
              }}
            >
              {message.images.map((image: string, imgIndex: number) => (
                <Box
                  key={imgIndex}
                  sx={{
                    borderRadius: 1,
                    overflow: 'hidden',
                    maxWidth: 80,
                    maxHeight: 80
                  }}
                >
                  <img
                    src={`data:image/jpeg;base64,${image}`}
                    alt={`Message image ${imgIndex + 1}`}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleImageClick(`data:image/jpeg;base64,${image}`)}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        )}
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </Typography>
        {message.role === 'assistant' && message.model_name && (
          <Box sx={{ mt: 1, mb: 1 }}>
            <Chip
              size="small"
              label={`${message.model_name} (${message.model_type?.toUpperCase()})`}
              color="info"
              variant="outlined"
            />
          </Box>
        )}
        {message.rating && (
          <Box sx={{ mt: 1, mb: 1 }}>
            <Chip
              size="small"
              icon={message.rating === 'like' ? <ThumbUp /> : <ThumbDown />}
              label={message.rating === 'like' ? 'Helpful' : 'Not Helpful'}
              color={message.rating === 'like' ? 'success' : 'error'}
              variant="outlined"
            />
            {message.rating === 'dislike' && message.reason && (
              <Typography 
                variant="caption" 
                display="block" 
                color="textSecondary" 
                sx={{ 
                  mt: 0.5,
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal',
                  maxWidth: '100%'
                }}
              >
                Reason: {message.reason}
              </Typography>
            )}
          </Box>
        )}
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          {formatDate(message.created_at)}
        </Typography>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ height: '100%' }}>
      {/* Main Content Card */}
        <Card sx={{ 
          borderRadius: 4,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <Box sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: 3
          }}>
            <Tabs 
              value={tabValue} 
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{
                '& .MuiTab-root': {
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  textTransform: 'none',
                  minHeight: 48,
                  '&.Mui-selected': {
                    color: 'white',
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'white',
                  height: 3,
                  borderRadius: 1.5
                }
              }}
            >
              <Tab 
                icon={<Group />} 
                iconPosition="start"
                label="Chat Sessions" 
                sx={{ mr: 2 }}
              />
              <Tab 
                icon={<Message />} 
                iconPosition="start"
                label="All Messages" 
              />
            </Tabs>
          </Box>
          
          <CardContent sx={{ p: 0 }}>
            <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {/* Filter Controls */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 3,
                flexDirection: isMobile ? 'column' : 'row',
                gap: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ChatBubble sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Chat Sessions
                  </Typography>
                  <Chip 
                    label={sessions.length} 
                    size="small" 
                    color="primary" 
                    sx={{ ml: 1 }}
                  />
                </Box>
                
                <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
                  <Button
                    startIcon={showFilters ? <ExpandLess /> : <ExpandMore />}
                    onClick={() => setShowFilters(!showFilters)}
                    variant={showFilters ? "contained" : "outlined"}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 3
                    }}
                  >
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Button>
                  <Button
                    startIcon={exporting ? <CircularProgress size={20} /> : <Download />}
                    onClick={(e) => handleExportClick(e, 'sessions')}
                    variant="outlined"
                    disabled={exporting}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 3,
                      borderColor: 'success.main',
                      color: 'success.main',
                      '&:hover': {
                        borderColor: 'success.dark',
                        backgroundColor: 'success.light'
                      }
                    }}
                  >
                    Export Sessions
                  </Button>
                </Stack>
              </Box>

            <Collapse in={showFilters} timeout={400}>
              <Paper sx={{ 
                p: 3, 
                mb: 3,
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                border: '1px solid rgba(102, 126, 234, 0.1)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <FilterList sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                    Filter Sessions
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
                  <Box>
                    <Autocomplete
                      size="small"
                      options={users}
                      getOptionLabel={(option) => option.username || ''}
                      value={users.find(user => user.username === sessionFilters.username) || null}
                      onChange={(_, newValue) => handleFilterChange('sessions', 'username', newValue?.username || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Username"
                          placeholder="Search users..."
                          sx={{ 
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2
                            }
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.light', width: 32, height: 32 }}>
                            <Person sx={{ fontSize: 16 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {option.username}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {option.email}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    />
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      size="small"
                      label="Model Name"
                      value={sessionFilters.modelName}
                      onChange={(e) => handleFilterChange('sessions', 'modelName', e.target.value)}
                      placeholder="Filter by model..."
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        }
                      }}
                    />
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      size="small"
                      label="From Date"
                      type="date"
                      value={sessionFilters.dateFrom}
                      onChange={(e) => handleFilterChange('sessions', 'dateFrom', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        }
                      }}
                    />
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      size="small"
                      label="To Date"
                      type="date"
                      value={sessionFilters.dateTo}
                      onChange={(e) => handleFilterChange('sessions', 'dateTo', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        }
                      }}
                    />
                  </Box>
                </Box>
                <Stack 
                  direction={isMobile ? 'column' : 'row'} 
                  spacing={2} 
                  sx={{ mt: 4 }}
                >
                  <Button
                    variant="contained"
                    onClick={applyFilters}
                    startIcon={<Search />}
                    sx={{ 
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                      }
                    }}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={clearFilters}
                    startIcon={<Clear />}
                    sx={{ 
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: 'primary.main',
                      color: 'primary.main'
                    }}
                  >
                    Clear All
                  </Button>
                </Stack>
              </Paper>
            </Collapse>

            {loading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Conversations</TableCell>
                        <TableCell>Model</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Last Activity</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {session.username}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {session.email}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={session.conversation_count}
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {session.model_name ? (
                              <Box>
                                <Chip
                                  size="small"
                                  label={session.model_name}
                                  color="info"
                                  variant="outlined"
                                  sx={{ mb: 0.5 }}
                                />
                                <Typography variant="caption" display="block" color="textSecondary">
                                  {session.model_type?.toUpperCase()}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="textSecondary">
                                No model
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(session.created_at)}</TableCell>
                          <TableCell>
                            {session.last_message_at
                              ? formatDate(session.last_message_at)
                              : 'No messages'}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleViewSession(session)}
                              disabled={session.conversation_count === 0}
                            >
                              <Visibility />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box display="flex" justifyContent="center" mt={2}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, newPage) => setPage(newPage)}
                    color="primary"
                  />
                </Box>
              </>
            )}
            </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              mb: 2 
            }}>
              <Button
                startIcon={<FilterList />}
                onClick={() => setShowFilters(!showFilters)}
                variant="outlined"
                size="small"
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button
                startIcon={exporting ? <CircularProgress size={20} /> : <Download />}
                onClick={(e) => handleExportClick(e, 'messages')}
                variant="outlined"
                size="small"
                disabled={exporting}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'success.main',
                  color: 'success.main',
                  '&:hover': {
                    borderColor: 'success.dark',
                    backgroundColor: 'success.light'
                  }
                }}
              >
                Export Messages
              </Button>
            </Box>

            <Collapse in={showFilters}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Filter Messages
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                    <Autocomplete
                      size="small"
                      options={users}
                      getOptionLabel={(option) => option.username || ''}
                      value={users.find(user => user.username === filters.username) || null}
                      onChange={(_, newValue) => handleFilterChange('messages', 'username', newValue?.username || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Username"
                          placeholder="Search users..."
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {option.username}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {option.email}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Role</InputLabel>
                      <Select
                        value={filters.role}
                        label="Role"
                        onChange={(e) => handleFilterChange('messages', 'role', e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="assistant">Assistant</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Model Name"
                      value={filters.modelName}
                      onChange={(e) => handleFilterChange('messages', 'modelName', e.target.value)}
                      placeholder="Filter by model..."
                      disabled={!!filters.role && filters.role !== 'assistant'}
                    />
                    {!!filters.role && filters.role !== 'assistant' && (
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                        Only assistant messages have model info
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
                    <FormControl fullWidth size="small" disabled={!!filters.role && filters.role !== 'assistant'}>
                      <InputLabel>Assistant Rating</InputLabel>
                      <Select
                        value={filters.rating}
                        label="Assistant Rating"
                        onChange={(e) => handleFilterChange('messages', 'rating', e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="like">Helpful</MenuItem>
                        <MenuItem value="dislike">Not Helpful</MenuItem>
                        <MenuItem value="none">No Rating</MenuItem>
                      </Select>
                    </FormControl>
                    {!!filters.role && filters.role !== 'assistant' && (
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                        Only assistant messages can be rated
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ flex: '1 1 180px', minWidth: '180px' }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="From Date"
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('messages', 'dateFrom', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 180px', minWidth: '180px' }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="To Date"
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('messages', 'dateTo', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Search Message Content"
                      value={filters.messageContent}
                      onChange={(e) => handleFilterChange('messages', 'messageContent', e.target.value)}
                      placeholder="Search in message text..."
                    />
                  </Box>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={applyFilters}
                    sx={{ mr: 1 }}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={clearFilters}
                    startIcon={<Clear />}
                  >
                    Clear
                  </Button>
                </Box>
              </Paper>
            </Collapse>

            {loading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Model</TableCell>
                        <TableCell>Message</TableCell>
                        <TableCell>Rating</TableCell>
                        <TableCell>Timestamp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {chatHistory.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {message.username}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={message.role}
                              color={message.role === 'user' ? 'primary' : 'secondary'}
                              icon={message.role === 'user' ? <Person /> : <SmartToy />}
                            />
                          </TableCell>
                          <TableCell>
                            {message.role === 'assistant' && message.model_name ? (
                              <Box>
                                <Chip
                                  size="small"
                                  label={message.model_name}
                                  color="info"
                                  variant="outlined"
                                  sx={{ mb: 0.5 }}
                                />
                                <Typography variant="caption" display="block" color="textSecondary">
                                  {message.model_type?.toUpperCase()}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="textSecondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {/* Display images if present */}
                            {message.images && message.images.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Box 
                                  sx={{ 
                                    display: 'flex',
                                    gap: 0.5,
                                    mb: 1
                                  }}
                                >
                                  {message.images.map((image: string, imgIndex: number) => (
                                    <Box
                                      key={imgIndex}
                                      sx={{
                                        borderRadius: 0.5,
                                        overflow: 'hidden',
                                        width: 40,
                                        height: 40
                                      }}
                                    >
                                      <img
                                        src={`data:image/jpeg;base64,${image}`}
                                        alt={`Message image ${imgIndex + 1}`}
                                        style={{
                                          width: '40px',
                                          height: '40px',
                                          objectFit: 'cover',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => handleImageClick(`data:image/jpeg;base64,${image}`)}
                                      />
                                    </Box>
                                  ))}
                                </Box>
                              </Box>
                            )}
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 400,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {message.content}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {message.rating ? (
                              <Box>
                                <Chip
                                  size="small"
                                  icon={message.rating === 'like' ? <ThumbUp /> : <ThumbDown />}
                                  label={message.rating === 'like' ? 'Helpful' : 'Not Helpful'}
                                  color={message.rating === 'like' ? 'success' : 'error'}
                                  variant="outlined"
                                />
                                {message.rating === 'dislike' && message.reason && (
                                  <Typography 
                                    variant="caption" 
                                    display="block" 
                                    color="textSecondary" 
                                    sx={{ 
                                      mt: 0.5,
                                      wordWrap: 'break-word',
                                      overflowWrap: 'break-word',
                                      whiteSpace: 'normal',
                                      maxWidth: '100%'
                                    }}
                                  >
                                    Reason: {message.reason}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="textSecondary">
                                No rating
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(message.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box display="flex" justifyContent="center" mt={2}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, newPage) => setPage(newPage)}
                    color="primary"
                  />
                </Box>
              </>
            )}
            </TabPanel>
          </CardContent>
        </Card>

      {/* Session Detail Dialog - Modernized */}
      <Dialog
      open={dialogOpen}
      onClose={() => setDialogOpen(false)}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 4,
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
            <Person />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Chat Session - {selectedSession?.username}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {selectedSession && formatDate(selectedSession.created_at)}
              {selectedSession?.model_name && (
                <> • Model: {selectedSession.model_name} ({selectedSession.model_type?.toUpperCase()})</>
              )}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
          {sessionMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button 
          onClick={() => setDialogOpen(false)}
          variant="outlined"
          sx={{ 
            borderRadius: 2,
            px: 4,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Close
        </Button>
      </DialogActions>
      </Dialog>
      
      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            minWidth: 200
          }
        }}
      >
        <MenuItem onClick={() => handleExport('json')}>
          <ListItemIcon>
            <Code />
          </ListItemIcon>
          <ListItemText>
            Export as JSON
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <Description />
          </ListItemIcon>
          <ListItemText>
            Export as CSV
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('xml')}>
          <ListItemIcon>
            <Storage />
          </ListItemIcon>
          <ListItemText>
            Export as XML
          </ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Image Modal */}
      <ImageModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageSrc={selectedImageSrc}
        alt="Image"
      />
    </Box>
  );
};

