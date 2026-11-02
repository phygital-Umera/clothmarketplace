import {Router} from 'express';
import {userController} from '@controllers/index';
import {authLimiter, verifyJWT} from '@middlewares/index';

const {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changePassword,
    forgotPassword,
    resetPassword,
    updateUser,
} = userController;

const router = Router();

// Public routes; the ones that take a password or send email are rate limited
router.route('/register').post(authLimiter, registerUser);
router.route('/login').post(authLimiter, loginUser);
router.route('/forgot-password').post(authLimiter, forgotPassword);
router.route('/reset-password').post(authLimiter, resetPassword);
router.route('/refresh').post(refreshAccessToken);

// Private routes
router.use(verifyJWT);

router.route('/logout').post(logoutUser);
router.route('/change-password').post(changePassword);
router.route('/me').get(getCurrentUser);
router.route('/update').patch(updateUser);

export default router;
