import {Router} from 'express';
import {billController as b} from '@controllers/index';

/** Purchase bills (stock in) and sales bills (stock out); stock updates are automatic */
export const mountBills = (router: Router) => {
    router.route('/purchase-bills').get(b.purchase.list).post(b.purchase.create);
    router
        .route('/purchase-bills/:id')
        .get(b.purchase.get)
        .patch(b.purchase.update)
        .delete(b.purchase.remove);
    router.post('/purchase-bills/:id/confirm', b.purchase.confirm);
    router.post('/purchase-bills/:id/cancel', b.purchase.cancel);
    router.post('/purchase-bills/:id/payments', b.purchase.payment);

    router.route('/sales-bills').get(b.sales.list).post(b.sales.create);
    router.route('/sales-bills/:id').get(b.sales.get).patch(b.sales.update).delete(b.sales.remove);
    router.post('/sales-bills/:id/confirm', b.sales.confirm);
    router.post('/sales-bills/:id/cancel', b.sales.cancel);
    router.post('/sales-bills/:id/payments', b.sales.payment);
};
