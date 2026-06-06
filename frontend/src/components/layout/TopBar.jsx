import React from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

const TopBar = ({ title = '', user = null, onLogout = () => { } }) => {
    return (
        <Box className="topBar">
            <Box>
                <Typography variant="h5" gutterBottom>{title}</Typography>
                <Typography color="textSecondary">GovRisk Ticketing</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {user && <Chip label={`Role: ${user.role || user}`} className="role-badge" />}
                <Button variant="outlined" startIcon={<LogoutIcon />} onClick={onLogout}>Logout</Button>
            </Box>
        </Box>
    );
};

export default TopBar;
