import {Router} from 'express';
import {cashBookController as cb, staffController, stockTransferController} from '@controllers/index';

/** Shop: Staff & rights, Cash book & day close, Stock transfer */
export const mountStaffCash = (router: Router) => {
    const st = staffController.shop;
    router.get('/staff', st.list);
    router.patch('/staff/:id/rights', st.updateRights);
    router.patch('/staff/:id/shift', st.updateShift);
    router.post('/staff/:id/attendance', st.attendance);
    router.route('/staff-requests').get(st.listRequests).post(st.createRequest);

    router.get('/cash-book', cb.getDay);
    router.post('/cash-book/entries', cb.addEntry);
    router.post('/cash-book/bank-deposit', cb.bankDeposit);
    router.post('/cash-book/close', cb.closeDay);

    const t = stockTransferController.shop;
    router.get('/transfers/shops', t.shops);
    router.get('/transfers/variants', t.variants);
    router.route('/transfers').get(t.list).post(t.create);
    router.get('/transfers/:id', t.get);
    router.post('/transfers/:id/dispatch', t.dispatch);
    router.post('/transfers/:id/receive', t.receive);
};
