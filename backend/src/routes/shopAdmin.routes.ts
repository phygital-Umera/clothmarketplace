import {Router} from 'express';
import {Role} from '@prisma/client';
import {
    customerController,
    ecommerceController as e,
    masterController as m,
    orgController as c,
    shopProductController as p,
    creditNoteController,
} from '@controllers/index';
import {checkRole, imageUpload, verifyJWT} from '@middlewares/index';
import {mountPromotions} from './promotion.routes';
import {mountBills} from './bill.routes';
import {mountShopOps} from './shopOps.routes';

const router = Router();

// Shop login: Shop Admin (also allow Super Admin / Company Admin / Sub Admin for testing / management)
router.use(verifyJWT, checkRole([Role.SHOP_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.SUB_ADMIN]));

// ---- Employees ----
router.route('/employees').get(c.listEmployees).post(c.createEmployee);
router.route('/employees/:id').get(c.getEmployee).patch(c.updateEmployee);

router.patch('/users/:id/status', c.setUserStatus);
router.post('/users/:id/revoke-sessions', c.revokeSessions);

// ---- 1. Categories ----
router.get('/categories/options', m.categoryOptions);
router.route('/categories').get(m.listCategories).post(m.createCategory);
router.route('/categories/:id').get(m.getCategory).patch(m.updateCategory).delete(m.deleteCategory);

// ---- 2. Subcategories ----
router.route('/subcategories').get(m.listSubcategories).post(m.createSubcategory);
router.route('/subcategories/:id').get(m.getSubcategory).patch(m.updateSubcategory).delete(m.deleteSubcategory);

// ---- 3. Colors ----
router.route('/colors').get(m.listColors).post(m.createColor);
router.route('/colors/:id').get(m.getColor).patch(m.updateColor).delete(m.deleteColor);

// ---- 4. Sizes ----
router.route('/sizes').get(m.listSizes).post(m.createSize);
router.route('/sizes/:id').get(m.getSize).patch(m.updateSize).delete(m.deleteSize);

// ---- 5. Products ----
router.route('/products').get(p.listProducts).post(p.createProduct);
router.route('/products/:id').get(p.getProduct).patch(p.updateProduct).delete(p.deleteProduct);
router.post('/products/:id/images', imageUpload.array('images', 8), p.uploadImages);
router.route('/products/:id/images/:imageId').patch(p.updateImage).delete(p.deleteImage);
router.post('/products/:id/previews', p.generatePreviews);
router.delete('/products/:id/previews/:previewId', p.deletePreview);

// ---- 6. Inventory & Stock Adjustments ----
router.get('/inventory/dashboard', e.inventoryDashboard);
router.get('/inventory', e.listInventory);
router.post('/inventory/adjust', e.adjustStock);
router.post('/inventory/batch-adjust', e.batchAdjustStock);
router.patch('/inventory/threshold', e.updateThreshold);
router.get('/inventory/movements', e.listMovements);

// ---- 7. Offers & Promotions Management ----
mountPromotions(router);

// ---- 8. Purchase & Sales Bills (automatic stock in / out) ----
mountBills(router);

// ---- Sales returns (credit notes); cash / large refunds wait for the branch admin ----
const cn = creditNoteController.shop;
router.route('/credit-notes').get(cn.list).post(cn.create);
router.get('/credit-notes/returnable', cn.returnable);
router.get('/credit-notes/:id', cn.get);

// ---- Shop Customers ----
router.get('/customers', customerController.list);
router.post('/customers', customerController.create);
router.get('/customers/:id', customerController.get);
router.patch('/customers/:id', customerController.update);
router.post('/customers/import', customerController.importExcel);

// ---- Shop dashboard, credit notes, cash counter, expenses ----
mountShopOps(router);

// ---- 9. Order Management & Returns ----
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

export default router;
