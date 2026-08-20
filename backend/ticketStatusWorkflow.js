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
    requestedStatus,
    mailSentToClient,
}) {
    const nextStatus = normalizeStatus(requestedStatus);
    const assignedRoleNormalized = normalizeRole(assignedRole);

    if (nextStatus !== 'DONE') {
        return {
            nextStatus,
            // do not set assignedToId here — undefined means "no change" to assignee
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
        return {
            nextStatus: confirmed ? 'DONE' : 'PENDING',
            // if confirmed, leave assignee unchanged (undefined => no change);
            // if not confirmed, keep assigned to the L2 reviewer
            assignedToId: confirmed ? undefined : (l2UserId ?? null),
            requiresClientMailConfirmation: true,
        };
    }

    return {
        nextStatus: 'DONE',
        // explicit no-change to assignee
        requiresClientMailConfirmation: false,
    };
}

module.exports = {
    resolveTicketStatusTransition,
};
