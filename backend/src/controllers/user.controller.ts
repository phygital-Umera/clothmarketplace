import httpStatus from 'http-status';
import {userService} from '@services/index';
import {catchAsync, ApiResponse} from '@utils/index';
import {userValidation} from '@validations/index';

const registerUser = catchAsync(async (req, res) => {
    const data = userValidation.registerUserSchema.parse(req.body);
    const user = await userService.registerCustomer(data);

    return res
        .status(httpStatus.CREATED)
        .json(new ApiResponse(httpStatus.CREATED, user, 'Account created successfully'));
});

const loginUser = catchAsync(async (req, res) => {
    const data = userValidation.loginUserSchema.parse(req.body);
    const {accessToken, refreshToken, user} = await userService.loginUser(data);

    return res
        .status(httpStatus.OK)
        .json(
            new ApiResponse(
                httpStatus.OK,
                {accessToken, refreshToken, user},
                'User logged in successfully',
            ),
        );
});

const logoutUser = catchAsync(async (req, res) => {
    await userService.logoutUser(req.user.id);

    return res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, {}, 'Logged out'));
});

const refreshAccessToken = catchAsync(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const tokens = await userService.refreshAccessToken(incomingRefreshToken);

    return res
        .status(httpStatus.OK)
        .json(new ApiResponse(httpStatus.OK, tokens, 'Token refreshed successfully'));
});

const getCurrentUser = catchAsync(async (req, res) => {
    const user = await userService.getCurrentUser(req.user.id);

    return res
        .status(httpStatus.OK)
        .json(
            new ApiResponse(
                httpStatus.OK,
                {...user, permissions: req.user.permissions},
                'User fetched successfully',
            ),
        );
});

const changePassword = catchAsync(async (req, res) => {
    const data = userValidation.changePasswordSchema.parse(req.body);
    const tokens = await userService.changePassword(req.user.id, data);

    return res
        .status(httpStatus.OK)
        .json(new ApiResponse(httpStatus.OK, tokens, 'Password changed successfully'));
});

const forgotPassword = catchAsync(async (req, res) => {
    const {identifier} = userValidation.forgotPasswordSchema.parse(req.body);
    await userService.forgotPassword(identifier);

    return res
        .status(httpStatus.OK)
        .json(
            new ApiResponse(
                httpStatus.OK,
                {},
                'If an account matches, a password reset link has been sent to its email.',
            ),
        );
});

const resetPassword = catchAsync(async (req, res) => {
    const data = userValidation.resetPasswordSchema.parse(req.body);
    await userService.resetPassword(data);

    return res
        .status(httpStatus.OK)
        .json(new ApiResponse(httpStatus.OK, {}, 'Password reset. You can sign in now.'));
});

const updateUser = catchAsync(async (req, res) => {
    const data = userValidation.updateUserSchema.parse(req.body);
    const user = await userService.updateUser(req.user.id, data);

    return res
        .status(httpStatus.OK)
        .json(new ApiResponse(httpStatus.OK, user, 'Profile updated successfully'));
});

export default {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changePassword,
    forgotPassword,
    resetPassword,
    updateUser,
};
