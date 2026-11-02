/**
 * Creates a new object with only the specified keys from the original object.
 * @param obj - The source object from which to pick properties.
 * @param keys - The keys to pick from the source object.
 * @returns A new object with only the specified keys.
 */
const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    return keys.reduce<Pick<T, K>>(
        (result, key) => {
            if (key in obj) {
                result[key] = obj[key];
            }
            return result;
        },
        {} as Pick<T, K>,
    );
};

export default pick;
