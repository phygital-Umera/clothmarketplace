import logger from '@config/logger';
import bcrypt from 'bcryptjs';

/**
 * Encrypts a given password using bcrypt.
 * @param password - The plaintext password to encrypt.
 * @returns A promise that resolves to the encrypted password.
 * @throws An error if hashing fails.
 */
export const encryptPassword = async (password: string): Promise<string> => {
    try {
        // BCRYPT_SALT_ROUNDS: 12 when unset or not a number, and never below 10
        const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '', 10);
        const saltRounds = Number.isNaN(rounds) ? 12 : Math.max(rounds, 10);
        const encryptedPassword = await bcrypt.hash(password, saltRounds);
        return encryptedPassword;
    } catch (error) {
        logger.error('Error encrypting password:', error);
        throw new Error('Failed to encrypt password.');
    }
};

/**
 * Compares a plaintext password with an encrypted password.
 * @param password - The plaintext password to compare.
 * @param userPassword - The encrypted password to compare against.
 * @returns A promise that resolves to a boolean indicating if the passwords match.
 * @throws An error if comparison fails.
 */
export const isPasswordMatch = async (password: string, userPassword: string): Promise<boolean> => {
    try {
        const match = await bcrypt.compare(password, userPassword);
        return match;
    } catch (error) {
        logger.error('Error comparing passwords:', error);
        throw new Error('Failed to compare passwords.');
    }
};
