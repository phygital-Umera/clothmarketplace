import {Router} from 'express';
import {Role} from '@prisma/client';
import httpStatus from 'http-status';
import {ecommerceController as e, userController} from '@controllers/index';
import {
    authLimiter,
    checkRole,
    customerPhotoUpload,
    loginIpLimiter,
    loginLimiter,
    verifyJWT,
} from '@middlewares/index';
import {ApiError, ApiResponse, catchAsync} from '@utils/index';
import {storeUpload} from '@utils/fileStore';

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

// Staff photos (profile, expense bills) get a URL here; store customers use /store/uploads.
// customerPhotoUpload = JPG/PNG/WEBP only (no SVG), 5 MB, one file.
router.post(
    '/uploads',
    checkRole([Role.SUPER_ADMIN, Role.ADMIN, Role.SUB_ADMIN, Role.SHOP_ADMIN, Role.EMPLOYEE]),
    customerPhotoUpload.single('photo'),
    catchAsync(async (req, res) => {
        if (!req.file) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose a photo');
        const url = await storeUpload(req, req.file, 'staff');
        res.status(httpStatus.CREATED).json(
            new ApiResponse(httpStatus.CREATED, {url}, 'Photo added'),
        );
    }),
);

// Customer orders (placing an order is POST /store/checkout)
router.get('/orders', e.listCustomerOrders);
router.get('/orders/:id', e.getCustomerOrder);
router.post('/orders/:id/cancel', e.customerCancelOrder);
router.post('/orders/:id/return', e.customerReturnOrder);

export default router;
