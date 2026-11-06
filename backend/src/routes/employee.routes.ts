import {Router} from 'express';
import {Role} from '@prisma/client';
import {checkRole, verifyJWT} from '@middlewares/index';
import {employeeModuleGuard} from '../middlewares/employeeAccess';
import {shopRoutes} from './shopAdmin.routes';

/*
 * Employees work in their own shop with the shop's API, limited to the modules
 * their shop admin gave them (view or edit). Data always comes from the
 * employee's own shop (req.user.shopId), exactly as for the shop login.
 */
const router = Router();

router.use(verifyJWT, checkRole(Role.EMPLOYEE), employeeModuleGuard, shopRoutes);

export default router;
