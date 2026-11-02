/**
 * Exclude keys from object
 * @param obj - The object from which keys should be removed
 * @param keys - An array of keys to be removed from the object
 * @returns - A new object with the specified keys removed
 */
const exclude = <Type, Key extends keyof Type>(obj: Type, keys: Key[]): Omit<Type, Key> => {
    const result = {...obj};

    for (const key of keys) {
        delete result[key];
    }

    return result as Omit<Type, Key>;
};

export default exclude;
