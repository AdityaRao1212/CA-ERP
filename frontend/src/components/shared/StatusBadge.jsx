import React from 'react';

const normalize = (s) => {
    if (!s) return 'MEDIUM';
    if (typeof s !== 'string') return String(s).toUpperCase();
    const map = {
        high: 'HIGH',
        low: 'LOW',
        medium: 'MEDIUM',
        critical: 'CRITICAL',
        closed: 'CLOSED',
    };
    const key = s.trim().toLowerCase();
    return map[key] || s.toUpperCase();
};

const StatusBadge = ({ severity = 'MEDIUM' }) => {
    const sev = normalize(severity);
    const cls = `severity-${sev}`;
    // Capitalize display nicely
    const label = sev[0] + sev.slice(1).toLowerCase();
    return <span className={`severity-badge ${cls}`}>{label}</span>;
};

export default StatusBadge;
