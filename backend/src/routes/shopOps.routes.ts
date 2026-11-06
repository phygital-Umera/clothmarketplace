import {Router} from 'express';
import {shopOpsController as s} from '@controllers/index';

/** Shop dashboard, cash counter and expenses (returns are credit notes) */
export const mountShopOps = (router: Router) => {
    router.get('/dashboard', s.dashboard);

    router.get('/counter/current', s.counter.current);
    router.post('/counter/open', s.counter.open);
    router.post('/counter/close', s.counter.close);

    router.route('/expenses').get(s.expenses.list).post(s.expenses.create);
};
