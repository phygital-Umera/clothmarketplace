import {Request, Response, Router} from 'express';
import {Role} from '@prisma/client';
import {z} from 'zod';
import httpStatus from 'http-status';
import {catchAsync, ApiResponse} from '@utils/index';
import {authLimiter, checkRole, customerPhotoUpload, verifyJWT} from '@middlewares/index';
import {storeUpload} from '@utils/fileStore';
import {userValidation} from '../validations';
import userService from '../services/user.service';
import notificationService from '../services/notification.service';
import storeOrders, {ORDER_TABS, RETURN_REASONS, cancelSchema, returnSchema} from '../services/store/orders.service';
import storeAccount, {SUPPORT_TOPICS, profileSchema, supportSchema} from '../services/store/account.service';
import catalogService, {productQuerySchema} from '../services/store/catalog.service';
import customerService, {
    DELIVERY_OPTIONS,
    addToCartSchema,
    addressSchema,
    reviewSchema,
    updateCartSchema,
} from '../services/store/customer.service';
import checkoutService, {checkoutSchema, paymentRefSchema, verifySchema} from '../services/store/checkout.service';

/*
 * Customer storefront API.
 *   Public:     catalog, product page, search suggestions, home, coupons, delivery check
 *              help topics, contact form, forgot / reset password
 *   Signed in:  bag, wishlist, addresses, checkout, payments, reviews, profile,
 *              orders (tabs, tracking, cancel, return / exchange, buy again),
 *              notifications, photo uploads (customers only)
 */

const ok = (res: Response, data: unknown, message = 'OK', status = 200) =>
    res.status(status).json(new ApiResponse(status, data, message));
const id = (req: Request, key = 'id') => z.string().uuid('Not found').parse(req.params[key]);
const me = (req: Request) => req.user.id;

const router = Router();

// ---------------- Public ----------------
router.get('/home', catchAsync(async (_req, res) => ok(res, await catalogService.home())));
router.get('/products', catchAsync(async (req, res) => ok(res, await catalogService.listProducts(productQuerySchema.parse(req.query)))));
router.get('/products/:idOrSlug', catchAsync(async (req, res) => ok(res, await catalogService.getProduct(String(req.params.idOrSlug)))));
router.get('/search/suggest', catchAsync(async (req, res) => ok(res, await catalogService.suggest(String(req.query.q ?? '')))));
router.get('/coupons', catchAsync(async (_req, res) => ok(res, await customerService.publicCoupons())));
router.get('/delivery/:pincode', catchAsync(async (req, res) => ok(res, catalogService.deliveryEstimate(String(req.params.pincode)))));
router.get('/payment-config', catchAsync(async (_req, res) => ok(res, checkoutService.paymentConfig())));
router.get('/help', catchAsync(async (_req, res) => ok(res, {topics: SUPPORT_TOPICS, returnReasons: RETURN_REASONS})));
router.post('/support', authLimiter, catchAsync(async (req, res) => ok(res, await storeAccount.support(null, supportSchema.parse(req.body)), 'Message sent. We reply within one working day.', httpStatus.CREATED)));
router.post('/auth/forgot-password', authLimiter, catchAsync(async (req, res) => {
    await storeAccount.forgotPassword(userValidation.forgotPasswordSchema.parse(req.body).identifier);
    ok(res, null, 'If an account matches, we have sent a reset link to its email.');
}));
router.post('/auth/reset-password', authLimiter, catchAsync(async (req, res) => {
    await userService.resetPassword(userValidation.resetPasswordSchema.parse(req.body));
    ok(res, null, 'Password reset. Sign in with your new password.');
}));

// ---------------- Customer ----------------
router.use(verifyJWT, checkRole(Role.USER));

const cartOpts = (req: Request) => ({
    couponCode: typeof req.query.coupon === 'string' && req.query.coupon ? req.query.coupon : undefined,
    delivery: z.enum(DELIVERY_OPTIONS).optional().parse(req.query.delivery || undefined),
});
router.get('/cart', catchAsync(async (req, res) => ok(res, await customerService.getCart(me(req), cartOpts(req)))));
router.post('/cart/items', catchAsync(async (req, res) => ok(res, await customerService.addToCart(me(req), addToCartSchema.parse(req.body)), 'Added to bag', httpStatus.CREATED)));
router.patch('/cart/items/:id', catchAsync(async (req, res) => ok(res, await customerService.updateLine(me(req), id(req), updateCartSchema.parse(req.body)), 'Bag updated')));
router.delete('/cart/items/:id', catchAsync(async (req, res) => ok(res, await customerService.removeLine(me(req), id(req), req.query.toWishlist === 'true'), req.query.toWishlist === 'true' ? 'Moved to wishlist' : 'Removed from bag')));

router.get('/wishlist', catchAsync(async (req, res) => ok(res, await customerService.wishlist(me(req)))));
router.get('/wishlist/ids', catchAsync(async (req, res) => ok(res, await customerService.wishlistIds(me(req)))));
router.post('/wishlist/:id', catchAsync(async (req, res) => ok(res, await customerService.addToWishlist(me(req), id(req)), 'Saved to wishlist')));
router.delete('/wishlist/:id', catchAsync(async (req, res) => ok(res, await customerService.removeFromWishlist(me(req), id(req)), 'Removed from wishlist')));

router.get('/addresses', catchAsync(async (req, res) => ok(res, await customerService.listAddresses(me(req)))));
router.post('/addresses', catchAsync(async (req, res) => ok(res, await customerService.saveAddress(me(req), addressSchema.parse(req.body)), 'Address saved', httpStatus.CREATED)));
router.patch('/addresses/:id', catchAsync(async (req, res) => ok(res, await customerService.saveAddress(me(req), addressSchema.parse(req.body), id(req)), 'Address saved')));
router.delete('/addresses/:id', catchAsync(async (req, res) => ok(res, await customerService.deleteAddress(me(req), id(req)), 'Address removed')));

router.post('/checkout', catchAsync(async (req, res) => ok(res, await checkoutService.checkout(me(req), checkoutSchema.parse(req.body)), 'Order placed', httpStatus.CREATED)));
router.post('/payments/verify', catchAsync(async (req, res) => ok(res, await checkoutService.verify(me(req), verifySchema.parse(req.body)), 'Payment successful')));
router.post('/payments/failed', catchAsync(async (req, res) => ok(res, await checkoutService.failed(me(req), paymentRefSchema.parse(req.body)), 'Payment not completed')));
router.post('/payments/retry', catchAsync(async (req, res) => ok(res, await checkoutService.retry(me(req), paymentRefSchema.parse(req.body).razorpayOrderId))));
router.post('/payments/cod', catchAsync(async (req, res) => ok(res, await checkoutService.switchToCod(me(req), paymentRefSchema.parse(req.body).razorpayOrderId), 'Changed to Cash on delivery')));
router.get('/payments/:razorpayOrderId', catchAsync(async (req, res) => ok(res, await checkoutService.status(me(req), String(req.params.razorpayOrderId)))));

router.post('/products/:id/reviews', catchAsync(async (req, res) => ok(res, await customerService.review(me(req), id(req), reviewSchema.parse(req.body)), 'Thanks for your review', httpStatus.CREATED)));
router.get('/reviews', catchAsync(async (req, res) => ok(res, {mine: await customerService.myReviews(me(req)), pending: await customerService.toReview(me(req))})));

router.get('/profile', catchAsync(async (req, res) => ok(res, await storeAccount.profile(me(req)))));
router.patch('/profile', catchAsync(async (req, res) => ok(res, await storeAccount.updateProfile(me(req), profileSchema.parse(req.body)), 'Profile saved')));
router.post('/profile/password', authLimiter, catchAsync(async (req, res) => {
    const tokens = await userService.changePassword(me(req), userValidation.changePasswordSchema.parse(req.body));
    await storeAccount.passwordChanged(me(req));
    ok(res, tokens, 'Password changed');
}));
router.post('/support/mine', catchAsync(async (req, res) => ok(res, await storeAccount.support(me(req), supportSchema.parse(req.body)), 'Message sent. We reply within one working day.', httpStatus.CREATED)));

router.post('/uploads', customerPhotoUpload.single('photo'), catchAsync(async (req, res) => {
    if (!req.file) return ok(res, null, 'Choose a photo', httpStatus.BAD_REQUEST);
    ok(res, {url: await storeUpload(req, req.file, 'customer')}, 'Photo added', httpStatus.CREATED);
}));

router.get('/orders', catchAsync(async (req, res) =>
    ok(res, await storeOrders.list(me(req), z.enum(ORDER_TABS).catch('all').parse(req.query.tab), typeof req.query.q === 'string' ? req.query.q : undefined))));
router.get('/orders/:id', catchAsync(async (req, res) => ok(res, await storeOrders.get(me(req), id(req)))));
router.post('/orders/:id/cancel', catchAsync(async (req, res) => {
    const result = await storeOrders.cancel(me(req), id(req), cancelSchema.parse(req.body ?? {}).reason);
    ok(res, result, result.message);
}));
router.post('/orders/:id/return', catchAsync(async (req, res) => ok(res, await storeOrders.requestReturn(me(req), id(req), returnSchema.parse(req.body)), 'Request sent. The shop will reply within 24 hours.', httpStatus.CREATED)));
router.post('/orders/:id/buy-again', catchAsync(async (req, res) => {
    const r = await storeOrders.buyAgain(me(req), id(req));
    ok(res, r, r.added.length ? `Added ${r.added.length} item${r.added.length > 1 ? 's' : ''} to your bag` : 'These items are no longer available');
}));
router.get('/returns', catchAsync(async (req, res) => ok(res, await storeOrders.returns(me(req)))));

router.get('/notifications', catchAsync(async (req, res) =>
    ok(res, await notificationService.list(me(req), z.enum(['all', 'unread', 'orders', 'offers', 'account']).catch('all').parse(req.query.tab), Math.max(1, Number(req.query.page) || 1)))));
router.get('/notifications/unread', catchAsync(async (req, res) => ok(res, await notificationService.unreadCount(me(req)))));
router.post('/notifications/read-all', catchAsync(async (req, res) => ok(res, await notificationService.markAllRead(me(req)))));
router.post('/notifications/:id/read', catchAsync(async (req, res) => ok(res, await notificationService.markRead(me(req), id(req)))));

export default router;
