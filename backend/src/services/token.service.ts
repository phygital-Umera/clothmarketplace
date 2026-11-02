import jwt, {JsonWebTokenError, NotBeforeError, TokenExpiredError} from 'jsonwebtoken';
import {config} from '@config/index';
import ApiError from '@utils/ApiError';
import prisma from '../client';

export type TokenType = 'access' | 'refresh';

export interface DecodedToken {
    id: string;
    type?: TokenType;
    [key: string]: unknown;
}

type UserPayload = {
    id: string;
    username?: string;
    email?: string;
    fullname: string;
    role: string;
};

type TokenData = {
    refreshToken: string;
    accessToken: string;
};

class TokenService {
    public generateAccessToken = (user: UserPayload): string => {
        return jwt.sign(
            {
                ...user,
                type: 'access',
            },
            config.jwt.secret,
            {
                expiresIn: `${config.jwt.accessExpirationMinutes}m`,
            },
        );
    };

    public generateRefreshToken = (userId: string): string => {
        return jwt.sign(
            {
                id: userId,
                type: 'refresh',
            },
            config.jwt.secret,
            {
                expiresIn: `${config.jwt.refreshExpirationDays}d`,
            },
        );
    };

    public generateAccessAndRefreshToken = async (user: UserPayload): Promise<TokenData> => {
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user.id);
        await prisma.user.update({where: {id: user.id}, data: {refreshToken}});
        return {accessToken, refreshToken};
    };

    /**
     * Verify the signature and that the token is of the expected type, so a
     * refresh token can never be used as an access token (and vice versa).
     */
    public verifyToken = (token: string, expectedType: TokenType): DecodedToken => {
        let decoded: DecodedToken;
        try {
            decoded = jwt.verify(token, config.jwt.secret) as DecodedToken;
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                throw new ApiError(401, 'Token has expired. Please login again');
            } else if (error instanceof NotBeforeError) {
                throw new ApiError(401, 'Token is not yet valid');
            } else if (error instanceof JsonWebTokenError) {
                throw new ApiError(401, 'Invalid token');
            } else {
                throw new ApiError(500, 'Token verification failed! Please login again');
            }
        }
        if (decoded.type !== expectedType) {
            throw new ApiError(401, 'Invalid token');
        }
        return decoded;
    };
}

export default new TokenService();
