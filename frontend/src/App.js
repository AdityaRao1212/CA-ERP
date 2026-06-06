import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import './App.css';
import './theme.css';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import StatusBadge from './components/shared/StatusBadge';

const categories = [
  'Human Resources',
  'Compliance',
  'Physical & Environmental Security',
  'Asset Management',
  'Operations Security',
  'Incident Management',
];

const riskLevels = ['Low', 'Medium', 'High'];

const initialRisk = {
  category: 'Human Resources',
  risk_statement: '',
  identified: '',
  inherent_risk: 'Medium',
  residual_risk: 'Medium',
  acceptable_risk: 'Low',
  owners: '',
  due_date: '',
};

const initialLogin = {
  username: '',
  password: '',
};

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken') || '');
  const [loginValues, setLoginValues] = useState(initialLogin);
  const [loginError, setLoginError] = useState('');
  const [risks, setRisks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRisk, setNewRisk] = useState(initialRisk);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');

  const canEdit = useMemo(() => user && ['admin', 'editor'].includes(user.role), [user]);
  const canView = useMemo(() => user && ['admin', 'editor', 'viewer'].includes(user.role), [user]);

  const authHeaders = useMemo(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  const handleLoginChange = (field) => (event) => {
    setLoginValues({ ...loginValues, [field]: event.target.value });
    setLoginError('');
  };

  const loadSession = async (authToken) => {
    if (!authToken) {
      setUser(null);
      return;
    }

    try {
      const response = await fetch('/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) {
        throw new Error('Session expired');
      }
      const data = await response.json();
      setUser(data.user);
      setLoginError('');
    } catch (error) {
      localStorage.removeItem('authToken');
      setToken('');
      setUser(null);
      setLoginError('Please sign in again.');
    }
  };

  const fetchRisks = useCallback(async () => {
    try {
      const response = await fetch('/risks', { headers: authHeaders });
      if (!response.ok) {
        throw new Error('Unable to load risks');
      }
      const data = await response.json();
      setRisks(data);
    } catch (error) {
      console.error('Unable to load risks:', error);
      setAlertSeverity('error');
      setAlertMessage('Could not retrieve risk register.');
    }
  }, [authHeaders]);

  useEffect(() => {
    if (token) {
      loadSession(token);
    }
  }, [token]);

  useEffect(() => {
    if (user && canView) {
      fetchRisks();
    }
  }, [user, canView, fetchRisks]);
  const handleLogin = async () => {
    if (!loginValues.username || !loginValues.password) {
      setLoginError('Username and password are required.');
      return;
    }

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginValues),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setLoginError(errorData.error || 'Login failed.');
        return;
      }

      const data = await response.json();
      localStorage.setItem('authToken', data.token);
      setToken(data.token);
      setUser(data.user);
      setLoginValues(initialLogin);
      setLoginError('');
      setAlertMessage('Welcome back!');
      setAlertSeverity('success');
    } catch (error) {
      setLoginError('Unable to reach server.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        headers: authHeaders,
      });
    } catch (error) {
      console.warn('Logout request failed', error);
    }
    localStorage.removeItem('authToken');
    setToken('');
    setUser(null);
    setRisks([]);
  };

  const handleDialogOpen = () => {
    setNewRisk(initialRisk);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleChange = (field) => (event) => {
    setNewRisk({ ...newRisk, [field]: event.target.value });
  };

  const handleSaveRisk = async () => {
    if (!newRisk.risk_statement || !newRisk.owners || !newRisk.due_date) {
      setAlertSeverity('warning');
      setAlertMessage('Please complete all required fields before saving.');
      return;
    }

    try {
      const response = await fetch('/risks', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newRisk),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unable to save risk.');
      }
      setDialogOpen(false);
      setAlertSeverity('success');
      setAlertMessage('Risk successfully added.');
      fetchRisks();
    } catch (error) {
      console.error('Unable to save risk:', error);
      setAlertSeverity('error');
      setAlertMessage(error.message);
    }
  };

  const filteredRisks = risks.filter((risk) => {
    const term = searchTerm.toLowerCase();
    return (
      risk.category.toLowerCase().includes(term) ||
      risk.risk_statement.toLowerCase().includes(term) ||
      risk.owners.toLowerCase().includes(term)
    );
  });

  if (!user) {
    return (
      <Box className="loginShell">
        <Paper className="loginCard" elevation={8}>
          <Typography variant="h4" gutterBottom>
            GovRisk Login
          </Typography>
          <Typography color="textSecondary" gutterBottom>
            Sign in to manage risk registers with role-based access control.
          </Typography>
          {loginError && <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>}
          <TextField
            label="Username"
            value={loginValues.username}
            onChange={handleLoginChange('username')}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Password"
            type="password"
            value={loginValues.password}
            onChange={handleLoginChange('password')}
            fullWidth
            margin="normal"
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
            <Typography variant="body2" color="textSecondary">
              Try admin/admin123, manager/manager123, or viewer/viewer123
            </Typography>
            <Button variant="contained" size="large" onClick={handleLogin}>
              Sign In
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box className="appShell">
      <Sidebar />

      <Box className="mainContent">
        <TopBar title="Incident Management" user={user} onLogout={handleLogout} />

        {alertMessage && (
          <Alert severity={alertSeverity} onClose={() => setAlertMessage('')} sx={{ mb: 3 }}>
            {alertMessage}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper className="statCard" elevation={2}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Audit Completion
              </Typography>
              <Typography variant="h4">87%</Typography>
              <Typography color="success.main">+12% from Q3</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper className="statCard" elevation={2}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Open Findings
              </Typography>
              <Typography variant="h4">23</Typography>
              <Typography color="error.main">8 Critical</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper className="statCard" elevation={2}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Compliance Score
              </Typography>
              <Typography variant="h4">92%</Typography>
              <Typography color="success.main">+3% improvement</Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box className="tableHeader">
          <TextField
            variant="outlined"
            placeholder="Search by category, statement, or owner"
            fullWidth
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: '#64748b' }} /> }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleDialogOpen}
            disabled={!canEdit}
          >
            Add Risk
          </Button>
        </Box>

        <TableContainer component={Paper} className="riskTable">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>CATEGORY</TableCell>
                <TableCell>RISK STATEMENT</TableCell>
                <TableCell>IDENTIFIED</TableCell>
                <TableCell>INHERENT</TableCell>
                <TableCell>RESIDUAL</TableCell>
                <TableCell>ACCEPTABLE</TableCell>
                <TableCell>OWNERS</TableCell>
                <TableCell>DUE DATE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRisks.map((risk) => (
                <TableRow key={risk.id} hover>
                  <TableCell>{risk.id}</TableCell>
                  <TableCell>{risk.category}</TableCell>
                  <TableCell>{risk.risk_statement}</TableCell>
                  <TableCell>{risk.identified}</TableCell>
                  <TableCell><StatusBadge severity={risk.inherent_risk} /></TableCell>
                  <TableCell><StatusBadge severity={risk.residual_risk} /></TableCell>
                  <TableCell><StatusBadge severity={risk.acceptable_risk} /></TableCell>
                  <TableCell>{risk.owners}</TableCell>
                  <TableCell>{risk.due_date}</TableCell>
                </TableRow>
              ))}
              {filteredRisks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No risk entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Risk</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={newRisk.category} label="Category" onChange={handleChange('category')}>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Identified"
                value={newRisk.identified}
                onChange={handleChange('identified')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Risk Statement"
                value={newRisk.risk_statement}
                onChange={handleChange('risk_statement')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Inherent Risk</InputLabel>
                <Select value={newRisk.inherent_risk} label="Inherent Risk" onChange={handleChange('inherent_risk')}>
                  {riskLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Residual Risk</InputLabel>
                <Select value={newRisk.residual_risk} label="Residual Risk" onChange={handleChange('residual_risk')}>
                  {riskLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Acceptable Risk</InputLabel>
                <Select value={newRisk.acceptable_risk} label="Acceptable Risk" onChange={handleChange('acceptable_risk')}>
                  {riskLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Owners" value={newRisk.owners} onChange={handleChange('owners')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={newRisk.due_date}
                onChange={handleChange('due_date')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRisk}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default App;
