import {Router} from 'express';
import {catalogController as c} from '@controllers/index';
import {imageUpload} from '@middlewares/index';

type CatalogAccess = {
    /** Super admin: the global category taxonomy */
    manageCategories?: boolean;
    /** Super admin (global brands) or company admin (own brands) */
    manageBrands?: boolean;
    /** Companies create / edit products; the super admin only monitors */
    manageProducts?: boolean;
};

/**
 * Catalog routes shared by the panels. What a user may do with a given
 * product (edit, publish, delete) is decided in productService.
 */
const mountCatalog = (router: Router, access: CatalogAccess) => {
    router.get('/categories/options', c.categoryOptions);
    router.get('/brands/options', c.brandOptions);

    if (access.manageCategories) {
        router.route('/categories').get(c.listCategories).post(c.createCategory);
        router.route('/categories/:id').patch(c.updateCategory).delete(c.deleteCategory);
    }
    if (access.manageBrands) {
        router.route('/brands').get(c.listBrands).post(c.createBrand);
        router.patch('/brands/:id', c.updateBrand);
    }

    router.get('/products', c.listProducts);
    router.get('/products/:id', c.getProduct);
    // Super admin may only unpublish (checked in the service)
    router.patch('/products/:id/status', c.setProductStatus);

    if (access.manageProducts) {
        router.post('/products', c.createProduct);
        router.route('/products/:id').patch(c.updateProduct).delete(c.deleteProduct);
        router.post('/products/:id/images', imageUpload.array('images', 8), c.uploadImages);
        router.route('/products/:id/images/:imageId').patch(c.updateImage).delete(c.deleteImage);
    }
};

export default mountCatalog;
