import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import AvatarCircle from '../shared/AvatarCircle';

const navItems = [
    { label: 'Dashboard', path: 'Dashboard' },
    { label: 'Tickets', path: 'Tickets' },
];

const Sidebar = ({ active = 'Dashboard', onNavigate = () => { }, user = null }) => {
    return (
        <Box className="sidebar" component="aside">
            <Box className="sidebarHeader">
                <Typography variant="h6">GovRisk</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    RBAC Risk Dashboard
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
