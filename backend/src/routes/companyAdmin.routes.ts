import {Router} from 'express';
import {orgController, ecommerceController, shopProductController as p} from '@controllers/index';
import {checkCompanyAdmin, verifyJWT} from '@middlewares/index';
import mountCatalog from './catalog.routes';
import {mountPromotions} from './promotion.routes';

const c = orgController;
const e = ecommerceController;
const router = Router();

// Everything here is scoped to the signed-in admin's company
router.use(verifyJWT, checkCompanyAdmin);

router.get('/dashboard', c.scopedDashboard);
router.get('/profile', c.companyProfile);

// Branches
router.get('/branches/options', c.branchOptions);
router.route('/branches').get(c.listBranches).post(c.createBranch);
router.route('/branches/:id').get(c.getBranch).patch(c.updateBranch);
router.patch('/branches/:id/status', c.setBranchStatus);

// Shops
router.get('/shops/options', c.shopOptions);
router.get('/shops/stats', c.shopStats);
router.route('/shops').get(c.listShops).post(c.createShop);
router.route('/shops/:id').get(c.getShop).patch(c.updateShop);
router.patch('/shops/:id/status', c.setShopStatus);

// Employees
router.route('/employees').get(c.listEmployees).post(c.createEmployee);
router.route('/employees/:id').get(c.getEmployee).patch(c.updateEmployee);

// Users status & session management
router.patch('/users/:id/status', c.setUserStatus);
router.post('/users/:id/revoke-sessions', c.revokeSessions);

// Catalog: own brands and all of the company's products
mountCatalog(router, {manageBrands: true, manageProducts: true});

// AI photo tools on any product of the company (same handlers as the shop panel)
router.get('/ai-status', p.aiStatus);
router.post('/products/:id/images/:imageId/clean', p.cleanBackground);
router.post('/products/:id/images/:imageId/professional', p.professionalPhoto);

// Inventory
router.get('/inventory/dashboard', e.inventoryDashboard);
router.get('/inventory', e.listInventory);
router.post('/inventory/adjust', e.adjustStock);
router.post('/inventory/batch-adjust', e.batchAdjustStock);
router.patch('/inventory/threshold', e.updateThreshold);
router.get('/inventory/movements', e.listMovements);

// Orders & Returns
router.get('/orders/dashboard', e.orderDashboard);
router.route('/orders').get(e.listOrders);
router.route('/orders/:id').get(e.getOrder);
router.patch('/orders/:id/status', e.updateOrderStatus);
router.patch('/orders/:id/shipping', e.updateOrderShipping);
router.patch('/orders/:id/payment', e.updateOrderPayment);
router.post('/orders/:id/cancel-review', e.reviewCancellation);
router.get('/orders/:id/invoice', e.getOrderInvoice);

router.get('/returns', e.listReturns);
router.patch('/returns/:id', e.updateReturnStatus);
router.patch('/returns/:id/status', e.updateReturnStatus);

// Promotions & Offers
mountPromotions(router);

export default router;
