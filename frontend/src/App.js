import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Chip,
  Stack,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import './App.css';
import './theme.css';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import AvatarCircle from './components/shared/AvatarCircle';
import PriorityBadge from './components/shared/PriorityBadge';

const categories = ['BUG', 'FEATURE', 'SECURITY', 'COMPLIANCE', 'OPERATIONS', 'INFRASTRUCTURE'];
const priorities = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];
const projectNames = ['HDFC', 'ICICI', 'SBI', 'Axis'];
const projectFilters = ['All Projects', ...projectNames];
const roleOptions = ['Admin', 'Manager', 'L1', 'L2'];

const initialTicket = {
  title: '',
  description: '',
  category: 'BUG',
  priority: 'MEDIUM',
  project: projectNames[0],
  assignedToId: '',
  dueDate: '',
};

const initialLogin = {
  username: '',
  password: '',
};

const App = () => {
  const [activePage, setActivePage] = useState('Tickets');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken') || '');
  const [loginValues, setLoginValues] = useState(initialLogin);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceRange, setAttendanceRange] = useState('All');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().slice(0, 7));
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear().toString());
  const [attendanceUserId, setAttendanceUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState(initialTicket);
  const [ticketAttachment, setTicketAttachment] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');
  const [assigningTicketId, setAssigningTicketId] = useState(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedPdfTicket, setSelectedPdfTicket] = useState(null);
  const pdfFileInputRef = useRef(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'L1',
    department: '',
    l2UserId: '',
  });
  const [ticketDialogError, setTicketDialogError] = useState('');
  const [userDialogError, setUserDialogError] = useState('');
  const [pdfDialogError, setPdfDialogError] = useState('');
  const [userPhoto, setUserPhoto] = useState(null);

  const canEdit = useMemo(
    () => user && ['Admin', 'Manager'].includes(user.role),
    [user]
  );
  const canManageUsers = useMemo(
    () => user && user.role === 'Admin',
    [user]
  );
  const canManageAttendance = useMemo(
    () => user && ['Admin', 'Manager'].includes(user.role),
    [user]
  );

  const authHeaders = useMemo(() => {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
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

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/users', { headers: authHeaders });
      if (!response.ok) {
        throw new Error('Unable to load users');
      }
      setUsers(await response.json());
    } catch (error) {
      console.error('Unable to load users:', error);
    }
  }, [authHeaders, token]);

  const fetchTickets = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/tickets', { headers: authHeaders });
      if (!response.ok) {
        throw new Error('Unable to load tickets');
      }
      setTickets(await response.json());
    } catch (error) {
      console.error('Unable to load tickets:', error);
      setAlertSeverity('error');
      setAlertMessage('Could not retrieve tickets.');
    }
  }, [authHeaders, token]);

  const fetchAttendance = useCallback(async (authToken = token, role = user?.role) => {
    if (!authToken || !['Admin', 'Manager'].includes(role)) return;
    try {
      const query = new URLSearchParams();
      const range = attendanceRange.toLowerCase();
      if (range !== 'all') {
        query.set('range', range);
        if (range === 'daily') query.set('date', attendanceDate);
        if (range === 'monthly') query.set('month', attendanceMonth);
        if (range === 'yearly') query.set('year', attendanceYear);
      }
      if (attendanceUserId) {
        query.set('userId', attendanceUserId);
      }

      const url = `/attendance${query.toString() ? `?${query.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`,
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) {
        throw new Error('Unable to load attendance');
      }
      setAttendance(await response.json());
    } catch (error) {
      console.error('Unable to load attendance:', error);
    }
  }, [attendanceRange, attendanceDate, attendanceMonth, attendanceYear, attendanceUserId, token, user?.role]);

  useEffect(() => {
    if (token) {
      loadSession(token);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchTickets();
    }
  }, [user, fetchUsers, fetchTickets]);

  useEffect(() => {
    if (activePage !== 'Attendance' || !user || !canManageAttendance) return;

    fetchAttendance(token, user.role);
    const intervalId = window.setInterval(() => {
      fetchAttendance(token, user.role);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [activePage, user, token, canManageAttendance, attendanceRange, attendanceDate, attendanceMonth, attendanceYear, attendanceUserId, fetchAttendance]);

  const handleLogin = async () => {
    const username = loginValues.username.trim();
    if (!username || !loginValues.password) {
      setLoginError('Email or username and password are required.');
      return;
    }

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: loginValues.password }),
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
      await fetchAttendance(data.token, data.user.role);
    } catch (error) {
      setLoginError('Unable to reach server.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST', headers: authHeaders });
    } catch (error) {
      console.warn('Logout request failed', error);
    }
    localStorage.removeItem('authToken');
    setToken('');
    setUser(null);
    setAttendance([]);
    setTickets([]);
    setUsers([]);
    setAlertMessage('You have been logged out.');
    setAlertSeverity('info');
  };

  const handlePageChange = (page) => setActivePage(page);

  const handleDialogOpen = () => {
    setNewTicket(initialTicket);
    setTicketAttachment(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setTicketAttachment(null);
    setTicketDialogError('');
  };

  const handleUserDialogOpen = () => {
    setEditingUserId(null);
    setNewUser({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'L1',
      department: '',
      l2UserId: '',
    });
    setUserPhoto(null);
    setUserDialogError('');
    setUserDialogOpen(true);
  };

  const handleEditUser = (profile) => {
    setEditingUserId(profile.id);
    setNewUser({
      name: profile.name,
      username: profile.username,
      email: profile.email,
      password: '',
      role: profile.role,
      department: profile.department,
      l2UserId: profile.l2UserId || '',
    });
    setUserPhoto(profile.photoData ? { name: profile.photoName || 'profile.jpg', type: profile.photoType || 'image/jpeg', data: profile.photoData } : null);
    setUserDialogError('');
    setUserDialogOpen(true);
  };

  const parseJsonResponse = async (response) => {
    const text = await response.text();
    const trimmed = text?.trim?.();
    if (!trimmed) {
      return { error: response.statusText || 'Unknown error' };
    }
    if (trimmed.startsWith('<')) {
      return { error: 'Server returned an unexpected response. Please try again.' };
    }
    try {
      return JSON.parse(text);
    } catch {
      return { error: text || response.statusText };
    }
  };

  const handleUserDialogClose = () => {
    setEditingUserId(null);
    setShowUserPassword(false);
    setUserDialogOpen(false);
    setUserDialogError('');
    setUserPhoto(null);
  };

  const handleTicketChange = (field) => (event) => {
    setNewTicket({ ...newTicket, [field]: event.target.value });
  };

  const handleTicketAttachmentChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setTicketAttachment(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      setTicketDialogError('Only PDF attachments are supported for ticket creation.');
      event.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setTicketDialogError('PDF uploads are limited to 15 MB.');
      event.target.value = '';
      return;
    }

    const attachmentData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Unable to read PDF attachment.'));
      reader.readAsDataURL(file);
    });

    setTicketAttachment({
      name: file.name,
      type: file.type,
      data: attachmentData,
    });
  };

  const handleNewUserChange = (field) => (event) => {
    setNewUser({ ...newUser, [field]: event.target.value });
  };

  const handleUserPhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setUserPhoto(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setUserDialogError('Profile photo must be an image file.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUserDialogError('Profile photo upload is limited to 5 MB.');
      event.target.value = '';
      return;
    }
    const photoData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Unable to read profile photo.'));
      reader.readAsDataURL(file);
    });
    setUserPhoto({ name: file.name, type: file.type, data: photoData });
  };

  const handleSaveUser = async () => {
    setUserDialogError('');

    if (!newUser.name || !newUser.username || !newUser.email || !newUser.role || !newUser.department) {
      setUserDialogError('Name, username, email, role, and department are required.');
      return;
    }

    if (newUser.role === 'L1' && !newUser.l2UserId) {
      setUserDialogError('Please assign an L2 reviewer for every L1 user.');
      return;
    }

    try {
      const payload = {
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        password: newUser.password || undefined,
        role: newUser.role,
        department: newUser.department,
        l2UserId: newUser.role === 'L1' ? Number(newUser.l2UserId) : null,
        photoName: userPhoto?.name || null,
        photoType: userPhoto?.type || null,
        photoData: userPhoto?.data || null,
      };

      const response = await fetch(editingUserId ? `/users/${editingUserId}` : '/users', {
        method: editingUserId ? 'PUT' : 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await parseJsonResponse(response);
        throw new Error(errorData.error || errorData.message || 'Unable to save user.');
      }

      const responseData = await parseJsonResponse(response);
      if (responseData.error) {
        throw new Error(responseData.error);
      }

      setEditingUserId(null);
      setShowUserPassword(false);
      setUserDialogOpen(false);
      setUserDialogError('');
      setAlertSeverity('success');
      setAlertMessage(editingUserId ? 'User updated successfully.' : 'User added successfully.');
      fetchUsers();
    } catch (error) {
      setUserDialogError(error.message || 'Unable to save user.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Remove this person from the system?')) {
      return;
    }

    try {
      const response = await fetch(`/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unable to remove user.');
      }
      setAlertSeverity('success');
      setAlertMessage('User removed successfully.');
      fetchUsers();
    } catch (error) {
      setAlertSeverity('error');
      setAlertMessage(error.message);
    }
  };

  const handleCreateTicket = async () => {
    setTicketDialogError('');
    if (!newTicket.title || !newTicket.description || !newTicket.category) {
      setTicketDialogError('Title, description, and category are required.');
      return;
    }

    try {
      const payload = {
        title: newTicket.title,
        description: newTicket.description,
        category: newTicket.category,
        priority: newTicket.priority,
        project: newTicket.project,
        assignedToId: newTicket.assignedToId || null,
        dueDate: newTicket.dueDate || null,
        attachment: ticketAttachment,
      };
      const response = await fetch('/tickets', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unable to create ticket.');
      }
      setDialogOpen(false);
      setTicketAttachment(null);
      setAlertSeverity('success');
      setAlertMessage('Ticket created successfully.');
      fetchTickets();
    } catch (error) {
      setTicketDialogError(error.message || 'Unable to create ticket.');
    }
  };

  const handleAssign = async (ticketId, assignedToId) => {
    try {
      const response = await fetch(`/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ assignedToId: assignedToId || null }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unable to update assignment.');
      }
      setAssigningTicketId(null);
      setSelectedAssignee('');
      setAlertSeverity('success');
      setAlertMessage('Ticket assignment updated successfully.');
      fetchTickets();
    } catch (error) {
      setAlertSeverity('error');
      setAlertMessage(error.message || 'Unable to update ticket assignment.');
    }
  };

  const handleStatusChange = async (ticketId, nextStatus) => {
    try {
      const response = await fetch(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unable to update status.');
      }
      setAlertSeverity('success');
      setAlertMessage('Ticket status updated successfully.');
      fetchTickets();
    } catch (error) {
      setAlertSeverity('error');
      setAlertMessage(error.message || 'Unable to update ticket status.');
    }
  };

  const handleOpenPdfViewer = (ticket) => {
    setSelectedPdfTicket(ticket);
    setPdfDialogOpen(true);
  };

  const handleClosePdfViewer = () => {
    setPdfDialogOpen(false);
    setSelectedPdfTicket(null);
    setPdfDialogError('');
  };

  const handleReuploadPdf = async (event, ticket) => {
    setPdfDialogError('');
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setPdfDialogError('Only PDF files can be uploaded.');
      event.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setPdfDialogError('PDF uploads are limited to 15 MB.');
      event.target.value = '';
      return;
    }

    try {
      const attachmentData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read PDF attachment.'));
        reader.readAsDataURL(file);
      });

      const response = await fetch(`/tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          assignedToId: ticket.assignedTo?.id || null,
          attachment: {
            name: file.name,
            type: file.type,
            data: attachmentData,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unable to update PDF attachment.');
      }

      const updatedTicket = await response.json();
      setSelectedPdfTicket(updatedTicket);
      setAlertSeverity('success');
      setAlertMessage('PDF updated successfully.');
      fetchTickets();
    } catch (error) {
      setAlertSeverity('error');
      setAlertMessage(error.message);
    } finally {
      event.target.value = '';
    }
  };

  const startAssign = (ticket) => {
    setAssigningTicketId(ticket.id);
    setSelectedAssignee(ticket.assignedTo?.id || '');
  };

  const cancelAssign = () => {
    setAssigningTicketId(null);
    setSelectedAssignee('');
  };

  const scopedTickets = useMemo(() => {
    const baseTickets = ['L1', 'L2'].includes(user?.role) ? tickets.filter((ticket) => ticket.assignedTo?.id === user?.id) : tickets;
    if (selectedProject === 'All Projects') {
      return baseTickets;
    }
    return baseTickets.filter((ticket) => ticket.project === selectedProject);
  }, [tickets, selectedProject, user?.id, user?.role]);

  const filteredTickets = scopedTickets.filter((ticket) => {
    const term = searchTerm.toLowerCase();
    return (
      ticket.ticketNumber.toLowerCase().includes(term) ||
      ticket.title.toLowerCase().includes(term) ||
      ticket.category.toLowerCase().includes(term) ||
      ticket.project?.toLowerCase().includes(term) ||
      ticket.assignedTo?.name?.toLowerCase().includes(term)
    );
  });

  const dashboardUsers = useMemo(() => {
    const relevantUsers = ['Admin', 'Manager'].includes(user?.role)
      ? users
      : users.filter((teamUser) => teamUser.id === user?.id);

    return relevantUsers.map((teamUser) => {
      const activeCount = tickets.filter((ticket) =>
        ticket.assignedTo?.id === teamUser.id && !['DONE', 'CANCELLED'].includes(ticket.status)
      ).length;
      return {
        ...teamUser,
        assignedCount: activeCount,
        availability: activeCount > 0 ? 'Occupied' : 'Available',
      };
    });
  }, [users, user?.id, user?.role, tickets]);

  const stats = useMemo(() => {
    const byStatus = statuses.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
    const byPriority = priorities.reduce((acc, priority) => ({ ...acc, [priority]: 0 }), {});
    let overdue = 0;
    scopedTickets.forEach((ticket) => {
      byStatus[ticket.status] += 1;
      byPriority[ticket.priority] += 1;
      if (ticket.dueDate && ticket.status !== 'DONE' && ticket.status !== 'CANCELLED') {
        const due = new Date(ticket.dueDate);
        if (due < new Date()) overdue += 1;
      }
    });
    return {
      total: scopedTickets.length,
      open: scopedTickets.filter((ticket) => ['TODO', 'IN_PROGRESS', 'IN_REVIEW'].includes(ticket.status)).length,
      overdue,
      done: byStatus.DONE,
      byStatus,
      byPriority,
    };
  }, [scopedTickets]);

  const projectCounts = useMemo(() => projectNames.map((project) => ({
    name: project,
    count: scopedTickets.filter((ticket) => ticket.project === project).length,
  })), [scopedTickets]);

  if (!user) {
    return (
      <Box className="loginShell">
        <Paper className="loginCard" elevation={8}>
          <Typography variant="h4" gutterBottom>
            CA-ERP System Login
          </Typography>
          <Typography color="textSecondary" gutterBottom>
            Sign in with your CA-ERP account to manage tickets.
          </Typography>
          {loginError && <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>}
          <TextField
            label="Email or Username"
            value={loginValues.username}
            onChange={handleLoginChange('username')}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={loginValues.password}
            onChange={handleLoginChange('password')}
            fullWidth
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    onClick={() => setShowPassword((visible) => !visible)}
                    size="small"
                    sx={{ minWidth: 0, padding: 0 }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </Button>
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Demo: alex@ca-erp.com / password123
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
      <Sidebar
        active={activePage}
        onNavigate={handlePageChange}
        user={user}
        canManageUsers={canManageUsers}
        canManageAttendance={canManageAttendance}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        projectCounts={projectCounts}
      />
      <Box className="mainContent">
        <TopBar
          title={
            activePage === 'Dashboard'
              ? 'CA-ERP System Dashboard'
              : activePage === 'Tickets'
                ? 'Ticket Management'
                : activePage === 'Attendance'
                  ? 'Attendance'
                  : 'Add people'
          }
          user={user}
          onLogout={handleLogout}
        />

        {alertMessage && (
          <Alert severity={alertSeverity} onClose={() => setAlertMessage('')} sx={{ mb: 3 }}>
            {alertMessage}
          </Alert>
        )}

        {activePage === 'Dashboard' ? (
          <>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Paper className="statCard" elevation={2}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Total Tickets
                  </Typography>
                  <Typography variant="h4">{stats.total}</Typography>
                  <Typography color="success.main">{stats.open} open</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper className="statCard" elevation={2}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Overdue
                  </Typography>
                  <Typography variant="h4">{stats.overdue}</Typography>
                  <Typography color="error.main">Needs attention</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper className="statCard" elevation={2}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Done
                  </Typography>
                  <Typography variant="h4">{stats.done}</Typography>
                  <Typography color="success.main">Completed</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper className="statCard" elevation={2}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Team Members
                  </Typography>
                  <Typography variant="h4">{users.length}</Typography>
                  <Typography color="textSecondary">Active workload</Typography>
                </Paper>
              </Grid>
            </Grid>

            <Paper className="projectScopeCard" elevation={0} sx={{ mb: 3 }}>
              <Box>
                <Typography variant="overline" color="textSecondary">
                  Project Scope
                </Typography>
                <Typography variant="h6">
                  {selectedProject === 'All Projects' ? 'All companies' : selectedProject}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Use the project folder in the left rail to isolate tickets by company.
              </Typography>
            </Paper>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Paper className="statCard" elevation={2}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Tickets by Status
                  </Typography>
                  <Box sx={{ mt: 1, display: 'grid', gap: 1 }}>
                    {statuses.map((status) => (
                      <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>{status.replace('_', ' ')}</Typography>
                        <Typography>{stats.byStatus[status] || 0}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper className="statCard" elevation={2}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Tickets by Priority
                  </Typography>
                  <Box sx={{ mt: 1, display: 'grid', gap: 1 }}>
                    {priorities.map((priority) => (
                      <Box key={priority} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>{priority}</Typography>
                        <Typography>{stats.byPriority[priority] || 0}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              {dashboardUsers.map((teamUser) => (
                <Grid item xs={12} md={4} key={teamUser.id}>
                  <Paper className="statCard" elevation={2}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                      <AvatarCircle
                        initials={teamUser.initials}
                        avatarColor={teamUser.avatarColor}
                        photoData={teamUser.photoData}
                        size="md"
                      />
                      <Box>
                        <Typography variant="subtitle1">{teamUser.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {teamUser.role} · {teamUser.department}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Chip
                        label={teamUser.availability}
                        size="small"
                        color={teamUser.assignedCount > 0 ? 'warning' : 'success'}
                      />
                      <Typography variant="body2" sx={{ color: 'textSecondary' }}>
                        {teamUser.assignedCount || 0} active tickets
                      </Typography>
                    </Stack>
                    <Button size="small" sx={{ mt: 1 }} onClick={() => { setActivePage('Tickets'); setSearchTerm(teamUser.name); }}>
                      View Tickets →
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        ) : activePage === 'Users' ? (
          <>
            <Box className="tableHeader" sx={{ mb: 3, alignItems: 'center' }}>
              <Typography variant="h6">Add people</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleUserDialogOpen} disabled={!canManageUsers}>
                Add User
              </Button>
            </Box>
            <TableContainer component={Paper} className="riskTable">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell align="right">Active Tickets</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((profile) => (
                    <TableRow key={profile.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <AvatarCircle
                            initials={profile.initials}
                            avatarColor={profile.avatarColor}
                            photoData={profile.photoData}
                            size="sm"
                          />
                          <Typography>{profile.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{profile.username}</TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>{profile.role}</TableCell>
                      <TableCell>{profile.department}</TableCell>
                      <TableCell align="right">{profile.assignedCount || 0}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            color="primary"
                            variant="outlined"
                            onClick={() => handleEditUser(profile)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => handleDeleteUser(profile.id)}
                            disabled={profile.id === user.id}
                          >
                            Remove
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No users available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : activePage === 'Attendance' ? (
          <>
            <Box className="tableHeader" sx={{ mb: 3, alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6">Attendance log</Typography>
                <Typography variant="body2" color="textSecondary">
                  Tracks login and logout timestamps for all users. Use the filters to inspect daily, monthly, or yearly history.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchAttendance}
                disabled={!canManageAttendance}
              >
                Refresh
              </Button>
            </Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Range</InputLabel>
                  <Select value={attendanceRange} label="Range" onChange={(event) => setAttendanceRange(event.target.value)}>
                    {['All', 'Daily', 'Monthly', 'Yearly'].map((option) => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {attendanceRange === 'Daily' && (
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Day"
                    type="date"
                    value={attendanceDate}
                    onChange={(event) => setAttendanceDate(event.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
              )}
              {attendanceRange === 'Monthly' && (
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Month"
                    type="month"
                    value={attendanceMonth}
                    onChange={(event) => setAttendanceMonth(event.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
              )}
              {attendanceRange === 'Yearly' && (
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Year"
                    type="number"
                    value={attendanceYear}
                    onChange={(event) => setAttendanceYear(event.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
              )}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>User</InputLabel>
                  <Select value={attendanceUserId} label="User" onChange={(event) => setAttendanceUserId(event.target.value)}>
                    <MenuItem value="">All users</MenuItem>
                    {users.map((userOption) => (
                      <MenuItem key={userOption.id} value={userOption.id}>{userOption.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2">Records: {attendance.length}</Typography>
              <Typography variant="subtitle2">Active sessions: {attendance.filter((entry) => !entry.logoutAt).length}</Typography>
              <Typography variant="subtitle2">Users: {new Set(attendance.map((entry) => entry.userName)).size}</Typography>
            </Box>
            <TableContainer component={Paper} className="riskTable">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Logged In</TableCell>
                    <TableCell>Logged Out</TableCell>
                    <TableCell>Duration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance.map((entry) => {
                    const loginTime = entry.loginAt ? new Date(entry.loginAt) : null;
                    const logoutTime = entry.logoutAt ? new Date(entry.logoutAt) : null;
                    const duration = loginTime && logoutTime ? `${Math.max(0, Math.round((logoutTime - loginTime) / 60000))} min` : 'Active';
                    return (
                      <TableRow key={entry.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <AvatarCircle initials={entry.initials} avatarColor={entry.avatarColor} size="sm" />
                            <Typography variant="body2">{entry.userName}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{entry.role}</TableCell>
                        <TableCell>{loginTime ? loginTime.toLocaleString() : '—'}</TableCell>
                        <TableCell>{logoutTime ? logoutTime.toLocaleString() : '—'}</TableCell>
                        <TableCell>{duration}</TableCell>
                      </TableRow>
                    );
                  })}
                  {attendance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No attendance records yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <>
            <Box className="tableHeader">
              <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel>Project</InputLabel>
                <Select
                  value={selectedProject}
                  label="Project"
                  onChange={(event) => setSelectedProject(event.target.value)}
                >
                  {projectFilters.map((project) => (
                    <MenuItem key={project} value={project}>{project}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                variant="outlined"
                placeholder="Search tickets, assignee, or category"
                fullWidth
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: '#64748b' }} /> }}
              />
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleDialogOpen} disabled={!canEdit}>
                New Ticket
              </Button>
            </Box>

            <TableContainer component={Paper} className="riskTable">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>PDF</TableCell>
                    <TableCell>Assigned</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} hover>
                      <TableCell>{ticket.ticketNumber}</TableCell>
                      <TableCell>{ticket.title}</TableCell>
                      <TableCell>{ticket.project || 'Unassigned'}</TableCell>
                      <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <Select value={ticket.status} onChange={(event) => handleStatusChange(ticket.id, event.target.value)}>
                            {statuses.map((status) => (
                              <MenuItem key={status} value={status}>{status.replace('_', ' ')}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        {ticket.assignmentPdfData ? (
                          <Button size="small" variant="text" onClick={() => handleOpenPdfViewer(ticket)}>
                            View PDF
                          </Button>
                        ) : (
                          <Button size="small" variant="outlined" onClick={() => handleOpenPdfViewer(ticket)}>
                            Upload PDF
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {assigningTicketId === ticket.id ? (
                          <FormControl fullWidth size="small">
                            <Select value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)}>
                              <MenuItem value="">Unassigned</MenuItem>
                              {users.map((u) => (
                                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : ticket.assignedTo ? (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <AvatarCircle initials={ticket.assignedTo.initials} avatarColor={ticket.assignedTo.avatarColor} size="sm" />
                            <Typography variant="body2">{ticket.assignedTo.name}</Typography>
                          </Stack>
                        ) : (
                          <Chip label="Unassigned" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'TBD'}</TableCell>
                      <TableCell align="right">
                        {assigningTicketId === ticket.id ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" onClick={cancelAssign}>Cancel</Button>
                            <Button variant="contained" size="small" onClick={() => handleAssign(ticket.id, selectedAssignee)}>
                              Save
                            </Button>
                          </Stack>
                        ) : (
                          <Button size="small" variant="outlined" onClick={() => startAssign(ticket)}>
                            {ticket.assignedTo ? 'Reassign' : 'Assign'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        {['L1', 'L2'].includes(user?.role) ? 'No tickets assigned yet.' : 'No tickets found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <Dialog open={pdfDialogOpen} onClose={handleClosePdfViewer} maxWidth="lg" fullWidth>
          <DialogTitle>{selectedPdfTicket?.assignmentPdfName || selectedPdfTicket?.ticketNumber || 'PDF Preview'}</DialogTitle>
          <DialogContent>
            {pdfDialogError && <Alert severity="error" sx={{ mb: 2 }}>{pdfDialogError}</Alert>}
            {selectedPdfTicket?.assignmentPdfData ? (
              <Box sx={{ height: 700, border: '1px solid #e2e8f0', borderRadius: 1, overflow: 'hidden' }}>
                <iframe
                  title={`pdf-${selectedPdfTicket?.id}`}
                  src={selectedPdfTicket.assignmentPdfData}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </Box>
            ) : (
              <Typography color="textSecondary">No PDF is attached to this ticket yet.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => pdfFileInputRef.current?.click()}>Upload / Replace PDF</Button>
            <Button onClick={handleClosePdfViewer}>Close</Button>
          </DialogActions>
          <input ref={pdfFileInputRef} hidden type="file" accept="application/pdf" onChange={(event) => selectedPdfTicket && handleReuploadPdf(event, selectedPdfTicket)} />
        </Dialog>

        <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Ticket</DialogTitle>
          <DialogContent>
            {ticketDialogError && <Alert severity="error" sx={{ mb: 2 }}>{ticketDialogError}</Alert>}
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="Title" value={newTicket.title} onChange={handleTicketChange('title')} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Description"
                  value={newTicket.description}
                  onChange={handleTicketChange('description')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={newTicket.category} label="Category" onChange={handleTicketChange('category')}>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select value={newTicket.priority} label="Priority" onChange={handleTicketChange('priority')}>
                    {priorities.map((priority) => (
                      <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Project</InputLabel>
                  <Select value={newTicket.project} label="Project" onChange={handleTicketChange('project')}>
                    {projectNames.map((project) => (
                      <MenuItem key={project} value={project}>{project}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Due Date"
                  type="date"
                  value={newTicket.dueDate}
                  onChange={handleTicketChange('dueDate')}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Assign To</InputLabel>
                  <Select value={newTicket.assignedToId} label="Assign To" onChange={handleTicketChange('assignedToId')}>
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" component="label" fullWidth>
                  {ticketAttachment ? ticketAttachment.name : 'Upload PDF Attachment'}
                  <input hidden type="file" accept="application/pdf" onChange={handleTicketAttachmentChange} />
                </Button>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                  Attach a PDF to keep the supporting document with the ticket.
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button variant="contained" onClick={handleCreateTicket}>Create Ticket</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={userDialogOpen} onClose={handleUserDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>{editingUserId ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogContent>
            {userDialogError && <Alert severity="error" sx={{ mb: 2 }}>{userDialogError}</Alert>}
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Name" value={newUser.name} onChange={handleNewUserChange('name')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Username" value={newUser.username} onChange={handleNewUserChange('username')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email" value={newUser.email} onChange={handleNewUserChange('email')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button variant="outlined" component="label" fullWidth>
                  {userPhoto?.name || 'Upload Profile Photo'}
                  <input hidden type="file" accept="image/*" onChange={handleUserPhotoChange} />
                </Button>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                  Optional profile photo for dashboard and user cards.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type={showUserPassword ? 'text' : 'password'}
                  label="Password"
                  value={newUser.password}
                  onChange={handleNewUserChange('password')}
                  helperText={editingUserId ? 'Leave blank to keep existing password' : ''}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          onClick={() => setShowUserPassword((visible) => !visible)}
                          size="small"
                          sx={{ minWidth: 0, padding: 0 }}
                        >
                          {showUserPassword ? <VisibilityOff /> : <Visibility />}
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select value={newUser.role} label="Role" onChange={handleNewUserChange('role')}>
                    {roleOptions.map((role) => (
                      <MenuItem key={role} value={role}>{role}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Department" value={newUser.department} onChange={handleNewUserChange('department')} />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>L2 Reviewer</InputLabel>
                  <Select
                    value={newUser.l2UserId}
                    label="L2 Reviewer"
                    onChange={handleNewUserChange('l2UserId')}
                    disabled={newUser.role !== 'L1'}
                  >
                    <MenuItem value="">Select an L2 reviewer</MenuItem>
                    {users.filter((userOption) => userOption.role === 'L2').map((userOption) => (
                      <MenuItem key={userOption.id} value={userOption.id}>{userOption.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                  Every L1 user must be linked to one L2 reviewer for review routing.
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleUserDialogClose}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveUser}>
              {editingUserId ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default App;
