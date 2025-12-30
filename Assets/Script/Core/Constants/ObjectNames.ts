/**
 * ObjectNames.ts
 * 
 * Centralized object name constants to replace magic strings.
 * Makes it easier to maintain and update object names.
 */

export const ObjectNames = {
    BUTTONS: {
        CONFIRM: ['Button_Confirm', 'Confirm', 'Button_Decline', 'Decline'],
        RESET: ['Button_Reset', 'Reset'],
        PLACE: ['Button_Placement', 'Place', 'Button_Place', 'Placement'],
        NEXT: ['NextButton', 'Next Button', 'Button_Next', 'next'],
        BACK: ['BackButton', 'Back Button', 'Button_Back', 'back', 'previous'],
        DONE: ['DoneButton', 'Done Button', 'Button_Done', 'done']
    },
    GUIDES: {
        PROJECTION: ['Guide', 'ProjectionGuide', 'Guide2_ContentHead'],
        HOW_TO_EDIT: ['HowToEdit_State', 'HowToEditState', 'HowToEdit', 'Guide3_ContentRefine'],
        IMAGE_GEN: ['imageGenGuide', 'ImageGenGuide']
    },
    STATES: {
        HOW_TO_EDIT: ['HowToEdit_State', 'HowToEditState', 'HowToEdit', 'Guide3_ContentRefine']
    }
} as const;

/**
 * Check if an object name matches any of the names in a category
 */
export function matchesObjectName(objName: string, category: readonly string[]): boolean {
    const nameLower = objName.toLowerCase();
    return category.some(name => 
        nameLower === name.toLowerCase() || 
        nameLower.includes(name.toLowerCase()) ||
        name.toLowerCase().includes(nameLower)
    );
}

/**
 * Check if an object is a button of a specific type
 */
export function isButtonType(objName: string, type: keyof typeof ObjectNames.BUTTONS): boolean {
    return matchesObjectName(objName, ObjectNames.BUTTONS[type]);
}

/**
 * Check if an object is a guide of a specific type
 */
export function isGuideType(objName: string, type: keyof typeof ObjectNames.GUIDES): boolean {
    return matchesObjectName(objName, ObjectNames.GUIDES[type]);
}

