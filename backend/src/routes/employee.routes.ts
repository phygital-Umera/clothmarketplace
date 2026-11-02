import {Router} from 'express';
import {Role} from '@prisma/client';
import {ecommerceController as e} from '@controllers/index';
import {checkPermission, checkRole, verifyJWT} from '@middlewares/index';
import mountCatalog from './catalog.routes';

const router = Router();

// Each tool needs the permission the employee's admin gave them; data is
// limited to the employee's own branch (see ecommerce / product services)
router.use(verifyJWT, checkRole(Role.EMPLOYEE));

// Stock of the branch
router.get('/inventory', checkPermission('inventory.view'), e.listInventory);
router.get('/inventory/movements', checkPermission('inventory.view'), e.listMovements);
router.post('/inventory/adjust', checkPermission('inventory.adjust'), e.adjustStock);

// Orders of the branch
router.get('/orders', checkPermission('orders.process'), e.listOrders);
router.get('/orders/:id', checkPermission('orders.process'), e.getOrder);
router.patch('/orders/:id/status', checkPermission('orders.process'), e.updateOrderStatus);

// Products: only past this point, so the routes above do not need it
router.use(checkPermission('products.manage'));
mountCatalog(router, {manageProducts: true});

export default router;
