
export enum Team {
    BLUE = 0,
    RED = 1
}

export enum Role {
    TANK = 'TANK',
    WARRIOR = 'WARRIOR',
    RANGER = 'RANGER',
    MAGE = 'MAGE',
    SUPPORT = 'SUPPORT'
}

export enum MovementType {
    GROUND = 0,
    FLYING = 1
}

export enum ActionState {
    IDLE = 0,
    WALKING = 1,
    ATTACKING = 2,
    EVADING = 3,
    CASTING = 4,
    STUNNED = 5,
    DYING = 6
}

export enum AnimState {
    IDLE = 0,
    COMBAT_IDLE = 1,
    ATTACK = 2,
    HIT = 3,
    DEAD = 4,
    STUN = 5,
    MOVE = 6
}

export enum AIState {
    IDLE = 0,
    WAITING = 1,
    CC_INTERRUPTED = 2,
    DEAD = 3,
    CASTING_ULT = 4,
    CASTING_ACTIVE = 5,
    CASTING_BASIC = 6,
    TRACKING = 7,
    EVADING = 8,
    EVADING_URGENT = 9,
    LAST_STAND_PUSH = 10,
    LAST_STAND_ATTACK = 11,
    COMBAT_LOCK = 12,
}
