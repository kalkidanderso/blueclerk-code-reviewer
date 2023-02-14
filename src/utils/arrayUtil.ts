
// To check if there is duplicate elements in array
export function checkIfDuplicateExists<T>(array: T[]): boolean {
    if (array) {
        return new Set(array).size !== array.length;
    }
    return false;
}

// To remove duplicate elements in array
export function removeDuplicate<T>(array: T[]): T[] {
    return Array.from(new Set(array));
}
