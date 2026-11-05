import {Router} from 'express';
import {shopOpsController as s} from '@controllers/index';

/** Shop dashboard, credit notes, cash counter and expenses */
export const mountShopOps = (router: Router) => {
    router.get('/dashboard', s.dashboard);

    router.route('/sales-returns').get(s.returns.list).post(s.returns.create);
    router.get('/sales-returns/:id', s.returns.get);

    router.get('/counter/current', s.counter.current);
    router.post('/counter/open', s.counter.open);
    router.post('/counter/close', s.counter.close);

    router.get('/expenses/next-number', s.expenses.nextNumber);
    router.route('/expenses').get(s.expenses.list).post(s.expenses.create);
};
