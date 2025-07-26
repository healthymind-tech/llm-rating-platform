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
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  Person,
  SmartToy,
  Search,
  ThumbUp,
  ThumbDown,
} from '@mui/icons-material';
import { metricsAPI } from '../services/api';

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
  const [tabValue, setTabValue] = useState(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (tabValue === 0) {
      fetchSessions();
    } else {
      fetchChatHistory();
    }
  }, [tabValue, page]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const limit = 10;
      const offset = (page - 1) * limit;
      const data = await metricsAPI.getChatSessions(limit, offset);
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
      const data = await metricsAPI.getChatHistory(limit, offset);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          {formatDate(message.created_at)}
        </Typography>
      </Paper>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Chat History & Sessions
      </Typography>

      <Card>
        <CardContent>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Chat Sessions" />
            <Tab label="All Messages" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
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
                        <TableCell>Messages</TableCell>
                        <TableCell>Rating</TableCell>
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
                              label={session.message_count}
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {session.rating ? (
                              <Chip
                                size="small"
                                icon={session.rating === 'like' ? <ThumbUp /> : <ThumbDown />}
                                label={session.rating === 'like' ? 'Helpful' : 'Not Helpful'}
                                color={session.rating === 'like' ? 'success' : 'error'}
                                variant="outlined"
                              />
                            ) : (
                              <Typography variant="caption" color="textSecondary">
                                No rating
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
                              disabled={session.message_count === 0}
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
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {loading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Search messages..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ width: 300 }}
                  />
                </Box>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Message</TableCell>
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

      {/* Session Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chat Session - {selectedSession?.username}
          <Typography variant="caption" display="block" color="textSecondary">
            {selectedSession && formatDate(selectedSession.created_at)}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
            {sessionMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};