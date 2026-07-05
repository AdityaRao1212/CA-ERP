import React, { useRef } from 'react';
import { Box, Typography, Chip, Button, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AvatarCircle from '../shared/AvatarCircle';

const TopBar = ({ title = '', user = null, onLogout = () => { }, onProfilePhotoUpload = null }) => {
    const fileRef = useRef(null);
    const triggerUpload = () => fileRef.current?.click();

    const initials = user?.initials || (user?.name ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '');
    const avatarColor = user?.avatarColor || '#3b82f6';

    return (
        <Box className="topBar">
            <Box>
                <Typography variant="h5" gutterBottom>{title}</Typography>
                <Typography color="textSecondary">CA-ERP System Ticketing</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {user && <Chip label={`Role: ${user.role || user}`} className="role-badge" />}
                {user && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title="Click avatar to upload an optional profile photo">
                            <IconButton onClick={triggerUpload} sx={{ p: 0 }} aria-label="upload profile photo">
                                <AvatarCircle initials={initials} avatarColor={avatarColor} photoData={user.photoData} size="md" uploadable onClick={triggerUpload} />
                            </IconButton>
                        </Tooltip>
                        <input ref={fileRef} hidden type="file" accept="image/*" onChange={(e) => onProfilePhotoUpload && onProfilePhotoUpload(e)} />
                    </Box>
                )}
                <Button variant="outlined" startIcon={<LogoutIcon />} onClick={onLogout}>Logout</Button>
            </Box>
        </Box>
    );
};

export default TopBar;
