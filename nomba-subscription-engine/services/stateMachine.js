// services/stateMachine.js
const VALID_TRANSITIONS = {
    'pending': ['active', 'past_due', 'FAILED_PENDING_AUTH'],
    'active': ['past_due', 'canceled'],
    'past_due': ['active', 'canceled', 'FAILED_PENDING_AUTH'],
    'FAILED_PENDING_AUTH': ['active', 'canceled'],
    'canceled': []
};

const validateTransition = (oldState, newState) => {
    if (!VALID_TRANSITIONS[oldState]?.includes(newState)) {
        throw new Error(`Invalid state transition: ${oldState} -> ${newState}`);
    }
    return true;
};

module.exports = { validateTransition };
