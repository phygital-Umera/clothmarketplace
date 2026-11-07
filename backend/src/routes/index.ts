import {Router} from 'express';
import userRoute from './user.routes';
import companyRoute from './company.routes';
import superAdminRoute from './superAdmin.routes';
import companyAdminRoute from './companyAdmin.routes';
import branchAdminRoute from './branchAdmin.routes';
import shopAdminRoute from './shopAdmin.routes';
import employeeRoute from './employee.routes';
import storeRoute from './store.routes';

const router = Router();

router.use('/users', userRoute);
router.use('/companies', companyRoute);
router.use('/super-admin', superAdminRoute);
router.use('/company-admin', companyAdminRoute);
router.use('/branch-admin', branchAdminRoute);
router.use('/shop-admin', shopAdminRoute);
router.use('/employee', employeeRoute);
// Customer storefront (public catalog + signed-in customer)
router.use('/store', storeRoute);

export default router;
