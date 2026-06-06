import React from 'react';
import { Box, Typography, Divider } from '@mui/material';

const Sidebar = ({ active = 'Dashboard' }) => {
    const main = ['Dashboard', 'Incident Management', 'Risk Management', 'Change Management', 'Non conformance', 'Corrective Action', 'Opportunity for Improvement'];
    const compliance = ['Repository', 'List Maker', 'ISO/IEC 9001:2015', 'ISO/IEC 22301:2019', 'ISO/IEC 27001:2013', 'ISO/IEC 27701:2019', 'ISO/IEC 20000:2018', 'ISO/IEC 45001:2018', 'ISO/IEC 14001:2015'];

    return (
        <Box className="sidebar" component="aside">
            <Box className="sidebarHeader">
                <Typography variant="h6">GovRisk</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>RBAC Risk Dashboard</Typography>
            </Box>

            <Box className="sidebarSection">
                <Typography variant="subtitle2" sx={{ color: 'var(--sidebar-text-muted)' }}>Main Menu</Typography>
                {main.map((item) => (
                    <Typography key={item} className={`sidebarLink ${item === active ? 'active' : ''}`}>{item}</Typography>
                ))}
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

            <Box className="sidebarSection">
                <Typography variant="subtitle2" sx={{ color: 'var(--sidebar-text-muted)' }}>Compliance</Typography>
                {compliance.map((item) => (
                    <Typography key={item} className="sidebarLink">{item}</Typography>
                ))}
            </Box>
        </Box>
    );
};

export default Sidebar;
