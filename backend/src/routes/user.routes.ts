import {Router} from 'express';
import {ecommerceController as e, userController} from '@controllers/index';
import {authLimiter, loginIpLimiter, loginLimiter, verifyJWT} from '@middlewares/index';

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
router.route('/login').post(loginIpLimiter, loginLimiter, loginUser);
router.route('/forgot-password').post(authLimiter, forgotPassword);
router.route('/reset-password').post(authLimiter, resetPassword);
router.route('/refresh').post(refreshAccessToken);

// Private routes
router.use(verifyJWT);

router.route('/logout').post(logoutUser);
router.route('/change-password').post(authLimiter, changePassword);
router.route('/me').get(getCurrentUser);
router.route('/update').patch(updateUser);

// Customer orders (placing an order is POST /store/checkout)
router.get('/orders', e.listCustomerOrders);
router.get('/orders/:id', e.getCustomerOrder);
router.post('/orders/:id/cancel', e.customerCancelOrder);
router.post('/orders/:id/return', e.customerReturnOrder);

export default router;
