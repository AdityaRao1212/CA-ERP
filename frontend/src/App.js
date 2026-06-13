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
  Chip,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
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
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState(initialTicket);
  const [ticketAttachment, setTicketAttachment] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');
  const [assigningTicketId, setAssigningTicketId] = useState(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');

  const canEdit = useMemo(
    () => user && ['ADMIN', 'MANAGER'].includes(user.role),
    [user]
  );

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

  const handleLogin = async () => {
    if (!loginValues.username || !loginValues.password) {
      setLoginError('Email or username and password are required.');
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
      await fetch('/auth/logout', { method: 'POST', headers: authHeaders });
    } catch (error) {
      console.warn('Logout request failed', error);
    }
    localStorage.removeItem('authToken');
    setToken('');
    setUser(null);
    setTickets([]);
    setUsers([]);
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
      setAlertSeverity('warning');
      setAlertMessage('Only PDF attachments are supported for ticket creation.');
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

  const handleCreateTicket = async () => {
    if (!newTicket.title || !newTicket.description || !newTicket.category) {
      setAlertSeverity('warning');
      setAlertMessage('Title, description, and category are required.');
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
      setAlertSeverity('error');
      setAlertMessage(error.message);
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
      setAlertMessage('Assignment updated.');
      fetchTickets();
    } catch (error) {
      setAlertSeverity('error');
      setAlertMessage(error.message);
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
    if (selectedProject === 'All Projects') {
      return tickets;
    }
    return tickets.filter((ticket) => ticket.project === selectedProject);
  }, [tickets, selectedProject]);

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
    count: tickets.filter((ticket) => ticket.project === project).length,
  })), [tickets]);

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
            type="password"
            value={loginValues.password}
            onChange={handleLoginChange('password')}
            fullWidth
            margin="normal"
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
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        projectCounts={projectCounts}
      />
      <Box className="mainContent">
        <TopBar title={activePage === 'Dashboard' ? 'CA-ERP System Dashboard' : 'Tickets'} user={user} onLogout={handleLogout} />

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
              {users.map((teamUser) => (
                <Grid item xs={12} md={4} key={teamUser.id}>
                  <Paper className="statCard" elevation={2}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                      <AvatarCircle initials={teamUser.initials} avatarColor={teamUser.avatarColor} size="md" />
                      <Box>
                        <Typography variant="subtitle1">{teamUser.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {teamUser.role} · {teamUser.department}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                      {teamUser.assignedCount || 0} tickets
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Open workload
                    </Typography>
                    <Button size="small" sx={{ mt: 2 }} onClick={() => { setActivePage('Tickets'); setSearchTerm(teamUser.name); }}>
                      View Tickets →
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
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
                      <TableCell><Chip label={ticket.status.replace('_', ' ')} size="small" /></TableCell>
                      <TableCell>
                        {ticket.assignmentPdfData ? (
                          <Button
                            size="small"
                            variant="text"
                            component="a"
                            href={ticket.assignmentPdfData}
                            download={ticket.assignmentPdfName || `${ticket.ticketNumber}.pdf`}
                          >
                            View PDF
                          </Button>
                        ) : (
                          <Chip label="None" size="small" variant="outlined" />
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
                      <TableCell colSpan={7} align="center">
                        No tickets found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Ticket</DialogTitle>
          <DialogContent>
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
      </Box>
    </Box>
  );
};

export default App;
