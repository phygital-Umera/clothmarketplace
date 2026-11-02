import {Router} from 'express';
import {companyController} from '@controllers/index';
import {checkPermission, checkSuperAdmin, imageUpload, verifyJWT} from '@middlewares/index';

const {createCompany, listCompanies, getCompany, updateCompany, deleteCompany} = companyController;

const router = Router();

// Super admin only, then a permission per action
router.use(verifyJWT, checkSuperAdmin);

router
    .route('/')
    .get(checkPermission('companies.view'), listCompanies)
    .post(checkPermission('companies.create'), imageUpload.single('logo'), createCompany);
router
    .route('/:id')
    .get(checkPermission('companies.view'), getCompany)
    .patch(checkPermission('companies.edit'), imageUpload.single('logo'), updateCompany)
    .delete(checkPermission('companies.delete'), deleteCompany);

export default router;
