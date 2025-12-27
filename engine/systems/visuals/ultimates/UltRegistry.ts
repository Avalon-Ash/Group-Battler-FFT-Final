
import { UltScriptFn } from "./UltTypes";

// Imperial
import { ImperialTankUlts } from "./imperial/ImperialTankUlts";
import { ImperialWarriorUlts } from "./imperial/ImperialWarriorUlts";
import { ImperialRangerUlts } from "./imperial/ImperialRangerUlts";
import { ImperialMageUlts } from "./imperial/ImperialMageUlts";
import { ImperialSupportUlts } from "./imperial/ImperialSupportUlts";

// Covenant
import { CovenantTankUlts } from "./covenant/CovenantTankUlts";
import { CovenantWarriorUlts } from "./covenant/CovenantWarriorUlts";
import { CovenantRangerUlts } from "./covenant/CovenantRangerUlts";
import { CovenantMageUlts } from "./covenant/CovenantMageUlts";
import { CovenantSupportUlts } from "./covenant/CovenantSupportUlts";

export const ULT_SCRIPTS: Record<string, UltScriptFn> = {
    ...ImperialTankUlts,
    ...ImperialWarriorUlts,
    ...ImperialRangerUlts,
    ...ImperialMageUlts,
    ...ImperialSupportUlts,
    
    ...CovenantTankUlts,
    ...CovenantWarriorUlts,
    ...CovenantRangerUlts,
    ...CovenantMageUlts,
    ...CovenantSupportUlts
};
