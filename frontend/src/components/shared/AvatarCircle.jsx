import React from 'react';
import { Box, Typography } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

const AvatarCircle = ({
    initials = '',
    avatarColor = '#3b82f6',
    size = 'md',
    photoData = null,
    onClick = null,
    uploadable = false,
}) => {
    const dimensions = size === 'sm' ? 32 : size === 'md' ? 48 : 56;
    return (
        <Box
            onClick={onClick}
            sx={{
                width: dimensions,
                height: dimensions,
                borderRadius: '50%',
                backgroundColor: photoData ? 'transparent' : avatarColor,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: size === 'sm' ? 14 : 16,
                position: 'relative',
                overflow: 'hidden',
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            {photoData ? (
                <img src={photoData} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
                <Typography variant="body2" sx={{ letterSpacing: 0.5 }}>
                    {initials}
                </Typography>
            )}

            {uploadable && (
                <Box sx={{ position: 'absolute', right: -2, bottom: -2, bgcolor: 'rgba(0,0,0,0.45)', borderRadius: '999px', p: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CameraAltIcon sx={{ fontSize: 14, color: '#fff' }} />
                </Box>
            )}
        </Box>
    );
};

export default AvatarCircle;
