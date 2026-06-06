import React from 'react';
import { Box, Typography } from '@mui/material';

const AvatarCircle = ({ initials = '', avatarColor = '#3b82f6', size = 'md' }) => {
    const dimensions = size === 'sm' ? 32 : size === 'md' ? 48 : 56;
    return (
        <Box
            sx={{
                width: dimensions,
                height: dimensions,
                borderRadius: '50%',
                backgroundColor: avatarColor,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: size === 'sm' ? 14 : 16,
            }}
        >
            <Typography variant="body2" sx={{ letterSpacing: 0.5 }}>
                {initials}
            </Typography>
        </Box>
    );
};

export default AvatarCircle;
