'use strict';

function normalizeStatus(value) {
    return String(value || '').trim().toUpperCase();
}

function normalizeRole(value) {
    return String(value || '').trim().toUpperCase();
}

function resolveTicketStatusTransition({
    currentStatus,
    assignedRole,
    l2UserId,
    currentAssigneeId,
    requestedStatus,
    mailSentToClient,
}) {
    const nextStatus = normalizeStatus(requestedStatus);
    const assignedRoleNormalized = normalizeRole(assignedRole);

    if (nextStatus !== 'DONE') {
        return {
            nextStatus,
            requiresClientMailConfirmation: false,
        };
    }

    if (assignedRoleNormalized === 'L1') {
        return {
            nextStatus: 'PENDING',
            assignedToId: l2UserId ?? null,
            requiresClientMailConfirmation: false,
        };
    }

    if (assignedRoleNormalized === 'L2') {
        const confirmed = mailSentToClient === true;
        if (confirmed) {
            return {
                nextStatus: 'DONE',
                requiresClientMailConfirmation: true,
            };
        }

        return {
            nextStatus: 'PENDING',
            assignedToId: currentAssigneeId ?? null,
            requiresClientMailConfirmation: true,
        };
    }

    return {
        nextStatus: 'DONE',
        requiresClientMailConfirmation: false,
    };
}

module.exports = {
    resolveTicketStatusTransition,
};
