import {Router} from 'express';
import {promotionController as pr} from '@controllers/index';
import {imageUpload} from '@middlewares/index';

export const mountPromotions = (router: Router) => {
    // 1. Dashboard
    router.get('/promotions/dashboard', pr.getDashboard);

    // 2. Offers
    router.route('/promotions/offers')
        .get(pr.listOffers)
        .post(imageUpload.single('banner'), pr.createOffer);
    router.route('/promotions/offers/:id')
        .get(pr.getOffer)
        .patch(imageUpload.single('banner'), pr.updateOffer)
        .delete(pr.deleteOffer);
    router.patch('/promotions/offers/:id/status', pr.toggleOfferStatus);

    // 3. Coupons
    router.route('/promotions/coupons')
        .get(pr.listCoupons)
        .post(imageUpload.single('banner'), pr.createCoupon);
    router.route('/promotions/coupons/:id')
        .get(pr.getCoupon)
        .patch(imageUpload.single('banner'), pr.updateCoupon)
        .delete(pr.deleteCoupon);
    router.patch('/promotions/coupons/:id/status', pr.toggleCouponStatus);

    // 4. Cart & Checkout Coupon Validation
    router.post('/promotions/coupons/validate', pr.validateCoupon);
};

