import {Router} from 'express';
import {
    orgController,
    ecommerceController,
    billController,
    creditNoteController,
    customerDueController,
    branchPurchaseController,
    supplierPaymentController,
    supplierController,
    barcodeLabelController,
    stockController,
    stockAdjustmentController,
    branchPricingController,
    stockTransferController,
    dayCloseController,
    branchApprovalController,
    branchExpenseController,
    branchReportsController,
    branchShopController,
    branchStaffController,
    staffController,
    branchShopAssignmentController,
    branchProfileSetupController,
} from '@controllers/index';
import {checkBranchAdmin, verifyJWT} from '@middlewares/index';
import mountCatalog from './catalog.routes';
import {mountPromotions} from './promotion.routes';

const c = orgController;
const e = ecommerceController;
const router = Router();

// Everything here is limited to the signed-in admin's own branch
router.use(verifyJWT, checkBranchAdmin);

router.get('/dashboard', c.scopedDashboard);
router.get('/overview', c.branchOverview);
router.get('/profile', c.branchProfile);

// Shops of this branch
router.get('/shops/options', c.shopOptions);
router.get('/shops/stats', c.shopStats);
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

// Products & Price List (Branch Pricing)
router.get('/products-pricing', branchPricingController.list);
router.post('/products-pricing/save', branchPricingController.savePrices);
router.post('/products-pricing/bulk', branchPricingController.scheduleBulkPrice);

// Branch Inventory
router.get('/inventory/dashboard', e.inventoryDashboard);
router.get('/inventory', e.listInventory);
router.post('/inventory/adjust', e.adjustStock);
router.post('/inventory/batch-adjust', e.batchAdjustStock);
router.patch('/inventory/threshold', e.updateThreshold);
router.get('/inventory/movements', e.listMovements);

// Stock Transfers
// Shops request stock; the branch admin approves and picks the source shop
const tr = stockTransferController.branch;
router.get('/transfers', tr.list);
router.get('/transfers/summary', tr.summary);
router.get('/transfers/:id', tr.get);
router.get('/transfers/:id/sources', tr.sources);
router.post('/transfers/:id/decision', tr.decide);

// Sales bills of every shop in the branch (view only; bills are made at the shop POS)
router.get('/sales-bills', billController.branchSales.list);
router.get('/sales-bills/summary', billController.branchSales.summary);
router.get('/sales-bills/export', billController.branchSales.export);
router.get('/sales-bills/:id', billController.branchSales.get);

// Customers & Dues (credit sales of the branch shops, credit limits, over-limit approvals)
router.get('/customer-dues', customerDueController.list);
router.get('/customer-dues/summary', customerDueController.summary);
router.get('/customer-dues/export', customerDueController.export);
router.post('/customer-dues/reminders', customerDueController.sendReminders);
router.get('/customer-dues/:id', customerDueController.get);
router.patch('/customer-dues/:id/limit', customerDueController.updateLimit);

// Purchase Bills of the branch and its shops
router.get('/purchase-bills', branchPurchaseController.list);
router.get('/purchase-bills/summary', branchPurchaseController.summary);
router.post('/purchase-bills', branchPurchaseController.create);
router.get('/purchase-bills/:id', branchPurchaseController.get);

// Suppliers & Payments
router.get('/suppliers', supplierPaymentController.list);
router.get('/suppliers/summary', supplierPaymentController.summary);
router.post('/suppliers/payment', supplierPaymentController.recordPayment);


// ---- Live Stock Summary & Audit ----
router.get('/stock/summary', stockController.getStockSummary);
router.post('/stock/adjust', stockController.adjustStock);
router.post('/stock/physical-count', stockController.recordPhysicalStockCount);

// ---- Stock Adjustments (Dedicated Page) ----
router.get('/stock-adjustments/next-number', stockAdjustmentController.getNextAdjustmentNumber);
router.get('/stock-adjustments/variants', stockAdjustmentController.getAdjustmentVariants);
router.get('/stock-adjustments', stockAdjustmentController.getAdjustmentHistory);
router.post('/stock-adjustments', stockAdjustmentController.createAdjustment);

// ---- Barcode Labels ----
router.get('/barcode-labels/purchase-bills', barcodeLabelController.getPurchaseBills);
router.get('/barcode-labels/bills/:billId/items', barcodeLabelController.getBillItems);
router.get('/barcode-labels/products', barcodeLabelController.searchProducts);
router.get('/barcode-labels/reprint-batches', barcodeLabelController.getReprintBatches);
router.post('/barcode-labels/print', barcodeLabelController.recordPrintJob);

// Accounts: Cash & Day Close
router.get('/day-close', dayCloseController.get);
router.post('/day-close/resolve-difference', dayCloseController.resolveDifference);
router.post('/day-close/bank-deposit', dayCloseController.recordDeposit);

// Accounts: Expenses
router.get('/expenses', branchExpenseController.list);
router.post('/expenses', branchExpenseController.add);

// Overview: Approvals
router.get('/approvals', branchApprovalController.list);
router.post('/approvals/:id/decision', branchApprovalController.decide);

// Reports
router.get('/reports/pnl', branchReportsController.getPnl);

// Setup: Shops Overview
router.get('/shops-overview', branchShopController.list);
router.post('/shops-overview', branchShopController.add);

// Setup: Staff Overview
router.get('/staff-overview', branchStaffController.list);
router.post('/staff-overview/invite', branchStaffController.invite);
router.get('/staff-requests', staffController.branch.listRequests);
router.post('/staff-requests/:id/decision', staffController.branch.decideRequest);

// Setup: Shop Assignment
router.get('/shop-assignment', branchShopAssignmentController.get);
router.post('/shop-assignment/move', branchShopAssignmentController.move);

// Setup: Branch Profile
router.get('/branch-profile', branchProfileSetupController.get);
router.patch('/branch-profile', branchProfileSetupController.update);

// Sales returns of every shop; the branch admin approves cash / large refunds
router.get('/credit-notes', creditNoteController.branch.list);
router.get('/credit-notes/summary', creditNoteController.branch.summary);
router.get('/credit-notes/:id', creditNoteController.branch.get);
router.post('/credit-notes/:id/decision', creditNoteController.branch.decide);

// Branch Orders
router.get('/orders/dashboard', e.orderDashboard);
router.route('/orders').get(e.listOrders);
router.route('/orders/:id').get(e.getOrder);
router.patch('/orders/:id/status', e.updateOrderStatus);
router.patch('/orders/:id/shipping', e.updateOrderShipping);
router.patch('/orders/:id/payment', e.updateOrderPayment);
router.post('/orders/:id/cancel-review', e.reviewCancellation);
router.get('/orders/:id/invoice', e.getOrderInvoice);

// Branch Returns
router.get('/returns', e.listReturns);
router.patch('/returns/:id', e.updateReturnStatus);

// Promotions & Offers
mountPromotions(router);

export default router;
