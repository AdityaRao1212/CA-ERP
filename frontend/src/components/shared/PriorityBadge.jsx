import React from 'react';
import { Box, Typography } from '@mui/material';

const colors = {
  URGENT: '#dc2626',
  HIGH: '#f97316',
  MEDIUM: '#0ea5e9',
  LOW: '#22c55e',
};

const PriorityBadge = ({ priority = 'MEDIUM' }) => {
  const normalized = String(priority).toUpperCase();
  const color = colors[normalized] || colors.MEDIUM;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        backgroundColor: `${color}22`,
        color,
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      <Typography variant="caption">{normalized.replace('_', ' ')}</Typography>
    </Box>
  );
};

export default PriorityBadge;
