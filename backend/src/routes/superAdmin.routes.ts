import {Router} from 'express';
import {orgController, ecommerceController} from '@controllers/index';
import {checkPermission, checkSuperAdmin, verifyJWT} from '@middlewares/index';
import mountCatalog from './catalog.routes';
import {mountPromotions} from './promotion.routes';

const c = orgController;
const e = ecommerceController;
const router = Router();

// Platform-wide views (companies themselves live under /companies)
router.use(verifyJWT, checkSuperAdmin);

router.get('/dashboard', checkPermission('dashboard.view'), c.superAdminDashboard);
router.get('/branches', checkPermission('branches.view'), c.listBranches);
router.get('/branches/:id', checkPermission('branches.view'), c.getBranch);
router.get('/shops', checkPermission('branches.view'), c.listShops);
router.get('/shops/stats', checkPermission('branches.view'), c.shopStats);
router.get('/shops/:id', checkPermission('branches.view'), c.getShop);
router.get('/users', checkPermission('users.view'), c.listUsers);
router.patch('/users/:id/status', checkPermission('users.block'), c.setUserStatus);
router.post('/users/:id/revoke-sessions', checkPermission('users.block'), c.revokeSessions);

// Catalog: global categories and brands; products are monitored (unpublish only)
mountCatalog(router, {manageCategories: true, manageBrands: true});

router.get('/orders', e.listOrders);
router.get('/orders/:id', e.getOrder);

router.get('/inventory/dashboard', e.inventoryDashboard);
router.get('/inventory', e.listInventory);
router.get('/inventory/movements', e.listMovements);
router.get('/returns', e.listReturns);

// Platform Promotions & Offers
mountPromotions(router);

export default router;
