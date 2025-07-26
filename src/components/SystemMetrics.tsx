import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  People,
  Chat,
  Message,
  TrendingUp,
  ThumbUp,
  ThumbDown,
} from '@mui/icons-material';
import { metricsAPI, messageRatingAPI } from '../services/api';
import { RatingStats } from '../types';

interface SystemMetricsData {
  totalUsers: number;
  totalSessions: number;
  totalMessages: number;
  activeUsers: number;
  messagesLast24h: number;
  averageSessionLength: number;
  topUsers: Array<{
    username: string;
    messageCount: number;
    sessionCount: number;
  }>;
  dailyActivity: Array<{
    date: string;
    messageCount: number;
    sessionCount: number;
  }>;
}

export const SystemMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetricsData | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchRatingStats();
  }, []);

  const fetchMetrics = async () => {
    try {
      const data = await metricsAPI.getSystemMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRatingStats = async () => {
    try {
      const stats = await messageRatingAPI.getRatingStats();
      setRatingStats(stats);
    } catch (error) {
      console.error('Failed to fetch rating stats:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Typography color="error" align="center">
        Failed to load system metrics
      </Typography>
    );
  }

  const MetricCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Box sx={{ color, fontSize: 40 }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        System Usage Overview
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers}
            icon={<People />}
            color="#1976d2"
          />
        </Box>
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <MetricCard
            title="Active Users"
            value={metrics.activeUsers}
            icon={<TrendingUp />}
            color="#2e7d32"
          />
        </Box>
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <MetricCard
            title="Chat Sessions"
            value={metrics.totalSessions}
            icon={<Chat />}
            color="#ed6c02"
          />
        </Box>
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <MetricCard
            title="Total Messages"
            value={metrics.totalMessages}
            icon={<Message />}
            color="#9c27b0"
          />
        </Box>
        {ratingStats && (
          <>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <MetricCard
                title="Likes"
                value={ratingStats.likes}
                icon={<ThumbUp />}
                color="#2e7d32"
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <MetricCard
                title="Dislikes"
                value={ratingStats.dislikes}
                icon={<ThumbDown />}
                color="#d32f2f"
              />
            </Box>
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Stats
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Messages (Last 24h)
                </Typography>
                <Typography variant="h6">
                  {metrics.messagesLast24h}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Avg. Session Length
                </Typography>
                <Typography variant="h6">
                  {metrics.averageSessionLength} min
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Active Users
              </Typography>
              <List dense>
                {metrics.topUsers.slice(0, 5).map((user, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={user.username}
                      secondary={
                        <Box display="flex" gap={1} mt={0.5}>
                          <Chip
                            size="small"
                            label={`${user.messageCount} msgs`}
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`${user.sessionCount} sessions`}
                            color="secondary"
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Activity (Last 7 Days)
              </Typography>
              <List dense>
                {metrics.dailyActivity.map((day, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={new Date(day.date).toLocaleDateString()}
                      secondary={
                        <Box display="flex" gap={1} mt={0.5}>
                          <Chip
                            size="small"
                            label={`${day.messageCount} msgs`}
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`${day.sessionCount} sessions`}
                            color="secondary"
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};