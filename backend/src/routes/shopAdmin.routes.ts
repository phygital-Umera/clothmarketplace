import {Router} from 'express';
import {Role} from '@prisma/client';
import {masterController as m, orgController as c} from '@controllers/index';
import {checkRole, verifyJWT} from '@middlewares/index';

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

export default router;
