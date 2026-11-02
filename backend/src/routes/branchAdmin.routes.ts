import {Router} from 'express';
import {orgController, ecommerceController} from '@controllers/index';
import {checkBranchAdmin, verifyJWT} from '@middlewares/index';
import mountCatalog from './catalog.routes';

const c = orgController;
const e = ecommerceController;
const router = Router();

// Everything here is limited to the signed-in admin's own branch
router.use(verifyJWT, checkBranchAdmin);

router.get('/dashboard', c.scopedDashboard);
router.get('/profile', c.branchProfile);

// Shops of this branch
router.get('/shops/options', c.shopOptions);
router.route('/shops').get(c.listShops).post(c.createShop);
router.route('/shops/:id').get(c.getShop).patch(c.updateShop);
router.patch('/shops/:id/status', c.setShopStatus);

// Employees of this branch
router.route('/employees').get(c.listEmployees).post(c.createEmployee);
router.route('/employees/:id').get(c.getEmployee).patch(c.updateEmployee);

router.patch('/users/:id/status', c.setUserStatus);
router.post('/users/:id/revoke-sessions', c.revokeSessions);

// Catalog: the company's products; edits limited to products of this branch
mountCatalog(router, {manageProducts: true});

// Branch Inventory
router.get('/inventory/dashboard', e.inventoryDashboard);
router.get('/inventory', e.listInventory);
router.post('/inventory/adjust', e.adjustStock);
router.post('/inventory/batch-adjust', e.batchAdjustStock);
router.patch('/inventory/threshold', e.updateThreshold);
router.get('/inventory/movements', e.listMovements);

// Branch Orders
router.route('/orders').get(e.listOrders);
router.route('/orders/:id').get(e.getOrder);
router.patch('/orders/:id/status', e.updateOrderStatus);

// Branch Returns
router.get('/returns', e.listReturns);

export default router;
