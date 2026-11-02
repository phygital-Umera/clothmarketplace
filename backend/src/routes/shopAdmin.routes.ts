import {Router} from 'express';
import {orgController as c} from '@controllers/index';
import {checkShopAdmin, verifyJWT} from '@middlewares/index';

const router = Router();

// Shop login: only the employees of their own shop
router.use(verifyJWT, checkShopAdmin);

router.route('/employees').get(c.listEmployees).post(c.createEmployee);
router.route('/employees/:id').get(c.getEmployee).patch(c.updateEmployee);

router.patch('/users/:id/status', c.setUserStatus);
router.post('/users/:id/revoke-sessions', c.revokeSessions);

export default router;
