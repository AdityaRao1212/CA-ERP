const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveTicketStatusTransition } = require('./ticketStatusWorkflow');

test('L1 completion routes to L2 as pending review', () => {
    const result = resolveTicketStatusTransition({
        currentStatus: 'TODO',
        assignedRole: 'L1',
        l2UserId: 42,
        requestedStatus: 'DONE',
        mailSentToClient: undefined,
    });

    assert.equal(result.nextStatus, 'PENDING');
    assert.equal(result.assignedToId, 42);
    assert.equal(result.requiresClientMailConfirmation, false);
});

test('Non-DONE transitions do not change assignee', () => {
    const result = resolveTicketStatusTransition({
        currentStatus: 'TODO',
        assignedRole: 'L1',
        l2UserId: 99,
        requestedStatus: 'IN_PROGRESS',
        mailSentToClient: undefined,
    });

    assert.equal(result.nextStatus, 'IN_PROGRESS');
    assert.equal(typeof result.assignedToId, 'undefined');
    assert.equal(result.requiresClientMailConfirmation, false);
});

test('L2 completion finalizes only when client mail is confirmed', () => {
    const confirmed = resolveTicketStatusTransition({
        currentStatus: 'PENDING',
        assignedRole: 'L2',
        l2UserId: 77,
        currentAssigneeId: 55,
        requestedStatus: 'DONE',
        mailSentToClient: true,
    });
    const declined = resolveTicketStatusTransition({
        currentStatus: 'PENDING',
        assignedRole: 'L2',
        l2UserId: 77,
        currentAssigneeId: 55,
        requestedStatus: 'DONE',
        mailSentToClient: false,
    });

    assert.equal(confirmed.nextStatus, 'DONE');
    assert.equal(Object.prototype.hasOwnProperty.call(confirmed, 'assignedToId'), false);
    assert.equal(declined.nextStatus, 'PENDING');
    assert.equal(declined.assignedToId, 55);
});
