import {Router} from 'express';
import userRoute from './user.routes';
import companyRoute from './company.routes';
import superAdminRoute from './superAdmin.routes';
import companyAdminRoute from './companyAdmin.routes';
import branchAdminRoute from './branchAdmin.routes';
import shopAdminRoute from './shopAdmin.routes';
import employeeRoute from './employee.routes';

const router = Router();

router.use('/users', userRoute);
router.use('/companies', companyRoute);
router.use('/super-admin', superAdminRoute);
router.use('/company-admin', companyAdminRoute);
router.use('/branch-admin', branchAdminRoute);
router.use('/shop-admin', shopAdminRoute);
router.use('/employee', employeeRoute);

export default router;
