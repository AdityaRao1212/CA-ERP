import React, { useState } from 'react';
import { Box, Typography, Divider, Chip, Collapse } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AvatarCircle from '../shared/AvatarCircle';

const navItems = [
    { label: 'Dashboard', path: 'Dashboard' },
    { label: 'Tickets', path: 'Tickets' },
];

const Sidebar = ({
    active = 'Dashboard',
    onNavigate = () => { },
    user = null,
    selectedProject = 'All Projects',
    onProjectChange = () => { },
    projectCounts = [],
}) => {
    const [projectsOpen, setProjectsOpen] = useState(false);

    return (
        <Box className="sidebar" component="aside">
            <Box className="sidebarHeader">
                <Typography variant="h6">CA-ERP System</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Risk and ticket operations
                </Typography>
            </Box>

            <Box className="sidebarSection">
                <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>
                    Main Menu
                </Typography>
                {navItems.map((item) => (
                    <Typography
                        key={item.label}
                        className={`sidebarLink ${item.label === active ? 'active' : ''}`}
                        onClick={() => onNavigate(item.path)}
                    >
                        {item.label}
                    </Typography>
                ))}
            </Box>

            <Box className="projectFolder">
                <Box className="projectFolderHeader" onClick={() => setProjectsOpen((open) => !open)}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ color: '#94a3b8', letterSpacing: '0.08em' }}>
                            Project Folder
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                            Route work by company
                        </Typography>
                    </Box>
                    {projectsOpen ? <ExpandLessIcon sx={{ color: '#cbd5e1' }} /> : <ExpandMoreIcon sx={{ color: '#cbd5e1' }} />}
                </Box>
                <Collapse in={projectsOpen} timeout="auto" unmountOnExit>
                    <Box className="projectFolderList">
                        <Typography
                            className={`projectFolderItem ${selectedProject === 'All Projects' ? 'active' : ''}`}
                            onClick={() => onProjectChange('All Projects')}
                        >
                            All Projects
                            <Chip label={projectCounts.reduce((sum, project) => sum + project.count, 0)} size="small" className="projectCountChip" />
                        </Typography>
                        {projectCounts.map((project) => (
                            <Typography
                                key={project.name}
                                className={`projectFolderItem ${selectedProject === project.name ? 'active' : ''}`}
                                onClick={() => onProjectChange(project.name)}
                            >
                                {project.name}
                                <Chip label={project.count} size="small" className="projectCountChip" />
                            </Typography>
                        ))}
                    </Box>
                </Collapse>
            </Box>

            <Box sx={{ flex: 1 }} />

            {user && (
                <Box className="sidebarUserCard">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <AvatarCircle initials={user.initials || user.name?.slice(0, 2)} avatarColor={user.avatarColor || '#3b82f6'} size="md" />
                        <Box>
                            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>
                                {user.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                {user.role}
                            </Typography>
                        </Box>
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 2 }} />
                    <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                        {user.email}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default Sidebar;
