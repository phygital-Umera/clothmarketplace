/**
 * Demo data for the store and the panels.
 *
 *   npm run seed:demo                 create the demo company (skips if it exists)
 *   npm run seed:demo -- --replace    archive the current demo company and its
 *                                     demo customers (nothing is deleted: they are
 *                                     switched off and their logins renamed), then
 *                                     create a fresh one
 *   npm run seed:demo -- --remove     switch the demo off (company inactive,
 *                                     products unpublished, logins blocked)
 *
 * Everything goes through the app's own services, exactly as the screens
 * would: masters, products with real photos, purchase bills (which put stock
 * in), counter sales, customers, online orders moved through the shop's order
 * flow (which writes the tracking history and the customer's notifications),
 * returns, exchanges and reviews. Dates are then spread over the last weeks so
 * the store looks lived-in.
 *
 * Product photos: public/uploads/products/demo (public domain, see CREDITS.md).
 * All logins use the password Demo@1234.
 */
import fs from 'fs';
import path from 'path';
import {AccountStatus, OrderStatus, ProductStatus, Role} from '@prisma/client';
import prisma from '../client';
import {config} from '@config/index';
import {encryptPassword} from '../utils/encryption';
import {billValidation, companyValidation, masterValidation, orgValidation, shopProductValidation} from '../validations';
import companyService from '../services/company.service';
import branchService from '../services/branch.service';
import shopService from '../services/shop.service';
import masterService from '../services/master.service';
import shopProductService from '../services/shopProduct.service';
import billService from '../services/bill.service';
import orderService from '../services/order.service';
import {notify} from '../services/notification.service';
import customerService from '../services/store/customer.service';
import checkoutService from '../services/store/checkout.service';
import storeOrders from '../services/store/orders.service';
import storeAccount from '../services/store/account.service';

const PASSWORD = 'Demo@1234';
const COMPANY_EMAIL = 'demo.company@clothpro.in';
const CUSTOMER_PHONES = ['9800000200', '9800000201', '9800000202', '9800000203'];
const COUPONS = ['FESTIVE10', 'WELCOME200', 'SAREE500', 'KIDS20'];
const DAY = 86_400_000;
const log = (s: string) => console.log(`  ${s}`);

// Photos are served by this API at /uploads/...; the store and panels run on other ports, so URLs are absolute
const PHOTO_DIR = path.join(__dirname, '../../public/uploads/products/demo');
const ASSET_BASE = (process.env.ASSET_BASE_URL ?? `http://localhost:${config.port}`).replace(/\/$/, '');
const MANIFEST: Record<string, string[]> = JSON.parse(fs.readFileSync(path.join(PHOTO_DIR, 'manifest.json'), 'utf8'));
const photoUrl = (file: string) => `${ASSET_BASE}/uploads/products/demo/${file}`;

type Gender = 'WOMEN' | 'MEN' | 'KIDS' | 'UNISEX';
type Item = {
    name: string;
    sub: string;
    brand: string;
    gender: Gender;
    mrp: number;
    price: number;
    fabric: string;
    sizes: string[];
    /** colour name -> photo set in the manifest */
    photos: Record<string, string>;
    desc: string;
    tags: string[];
    fit?: string;
};

const COLORS: Record<string, string> = {
    Black: '#1E1E1E', Green: '#3E6B48', Teal: '#2F7F7A', Ivory: '#EFE6D2', White: '#F7F7F2', Coral: '#E07A5F',
    Navy: '#1F2D4F', Saffron: '#F4A300', Peach: '#F2B8A0', Pink: '#E7A6B5', Indigo: '#3B4D8F', Rust: '#B5552E',
    Charcoal: '#3A3A3A', Olive: '#6B7444', 'Royal Blue': '#2E3FA8', Maroon: '#7A2232', Red: '#C0392B',
    Beige: '#D8C3A5', Brown: '#6B4B3A', Blue: '#3D6CA8', Ruby: '#9B1B30',
};

const ADULT = ['S', 'M', 'L', 'XL'];
const KIDS = ['2Y', '4Y', '6Y', '8Y'];
const FREE = ['Free'];

const CATEGORIES: {name: string; subs: string[]; items: Item[]}[] = [
    {
        name: 'Women',
        subs: ['Kurtis', 'Tops & Blouses', 'Jackets'],
        items: [
            {name: 'Mirror-work Silk Kurti', sub: 'Kurtis', brand: 'Desi Roots', gender: 'WOMEN', mrp: 3299, price: 2499, fabric: 'Silk', sizes: ['S', 'M', 'L', 'XL', 'XXL'], photos: {Green: 'mirror-kurti-green', Black: 'mirror-kurti-black', Teal: 'mirror-kurti-teal'}, desc: 'A-line silk kurti with a hand-embroidered yoke of tiny mirrors and chain stitch, finished with a contrast hem band. Knee length with elbow sleeves. Pairs with churidar or palazzos.', tags: ['kurti', 'mirror work', 'embroidered', 'festive']},
            {name: 'Hand-embroidered Folk Blouse', sub: 'Tops & Blouses', brand: 'Desi Roots', gender: 'WOMEN', mrp: 1599, price: 1299, fabric: 'Cotton', sizes: ADULT, photos: {Ivory: 'folk-blouse-ivory'}, desc: 'Loose cotton blouse with cross-stitch flowers running down both sleeves. A relaxed peasant fit with a gathered neckline.', tags: ['blouse', 'top', 'embroidered', 'cotton']},
            {name: 'Victorian Cotton Blouse', sub: 'Tops & Blouses', brand: 'Matoshri Label', gender: 'WOMEN', mrp: 1299, price: 999, fabric: 'Cotton', sizes: ['XS', 'S', 'M', 'L'], photos: {White: 'cotton-blouse-white'}, desc: 'Crisp white cotton voile with a high pin-tucked collar, full bishop sleeves and a drawstring waist.', tags: ['blouse', 'top', 'cotton', 'white']},
            {name: 'Lace Overlay Jacket', sub: 'Jackets', brand: 'Matoshri Label', gender: 'WOMEN', mrp: 2499, price: 1899, fabric: 'Lace', sizes: ADULT, photos: {Ivory: 'lace-jacket-ivory'}, desc: 'Short open-front jacket in ivory cotton lace, lined at the body. Throw it over a saree blouse or a slip dress.', tags: ['jacket', 'lace', 'party wear']},
            {name: 'Brocade Peplum Jacket', sub: 'Jackets', brand: 'Matoshri Label', gender: 'WOMEN', mrp: 2999, price: 2299, fabric: 'Brocade', sizes: ADULT, photos: {Coral: 'peplum-jacket-coral'}, desc: 'Fitted brocade jacket with a flared peplum and tie sleeves, woven with coral and gold florals.', tags: ['jacket', 'brocade', 'festive']},
            {name: 'Embroidered Wool Jacket', sub: 'Jackets', brand: 'Urban Weave', gender: 'WOMEN', mrp: 3499, price: 2799, fabric: 'Wool', sizes: ADULT, photos: {Navy: 'wool-jacket-blue'}, desc: 'Boxy wool jacket in indigo felt, edged with gold embroidery at the cuffs and hem. Warm enough for Pune winters.', tags: ['jacket', 'wool', 'winter']},
        ],
    },
    {
        name: 'Ethnic',
        subs: ['Lehengas', 'Sarees'],
        items: [
            {name: 'Digital Print Silk Lehenga', sub: 'Lehengas', brand: 'Matoshri Label', gender: 'WOMEN', mrp: 7999, price: 5999, fabric: 'Art Silk', sizes: ['S', 'M', 'L'], photos: {Teal: 'printed-lehenga-teal', Saffron: 'printed-lehenga-saffron', Peach: 'printed-lehenga-peach'}, desc: 'Flared art-silk lehenga with an all-over folk-art print, matching crop blouse and net dupatta. Light enough to dance in.', tags: ['lehenga', 'printed', 'sangeet', 'festive']},
            {name: 'Ombré Print Lehenga', sub: 'Lehengas', brand: 'Matoshri Label', gender: 'WOMEN', mrp: 8499, price: 6499, fabric: 'Georgette', sizes: ['S', 'M', 'L'], photos: {Pink: 'ombre-lehenga-pink'}, desc: 'Pink-to-indigo ombré georgette lehenga with a polka border and a tie-back blouse.', tags: ['lehenga', 'ombre', 'party wear']},
            {name: 'Brocade Jacket Lehenga', sub: 'Lehengas', brand: 'Desi Roots', gender: 'WOMEN', mrp: 11999, price: 8999, fabric: 'Brocade', sizes: ['S', 'M', 'L', 'XL'], photos: {Indigo: 'jacket-lehenga-indigo'}, desc: 'Indigo brocade lehenga with a zari border, worn with a sleeveless red jacket-style choli.', tags: ['lehenga', 'brocade', 'wedding']},
            {name: 'Floral Embroidered Lehenga', sub: 'Lehengas', brand: 'Desi Roots', gender: 'WOMEN', mrp: 9999, price: 7499, fabric: 'Silk', sizes: ['S', 'M', 'L'], photos: {Rust: 'floral-lehenga-rust'}, desc: 'Rust silk lehenga covered in thread-work florals, with a black sequinned full-sleeve blouse.', tags: ['lehenga', 'embroidered', 'wedding']},
            {name: 'Copper Zari Lehenga', sub: 'Lehengas', brand: 'Matoshri Label', gender: 'WOMEN', mrp: 8999, price: 6999, fabric: 'Silk', sizes: ['S', 'M', 'L'], photos: {Charcoal: 'copper-lehenga-charcoal'}, desc: 'Charcoal silk skirt with fine copper zari checks, paired with a long copper jacket blouse.', tags: ['lehenga', 'zari', 'reception']},
            {name: 'Crop-top Lehenga Set', sub: 'Lehengas', brand: 'Urban Weave', gender: 'WOMEN', mrp: 6999, price: 5499, fabric: 'Silk', sizes: ['S', 'M', 'L'], photos: {Olive: 'croptop-lehenga-olive'}, desc: 'Olive textured skirt with a printed full-sleeve crop top. Modern, easy, and re-wearable as separates.', tags: ['lehenga', 'crop top', 'mehendi']},
            {name: 'Paithani Silk Saree', sub: 'Sarees', brand: 'Matoshri Label', gender: 'WOMEN', mrp: 15999, price: 12999, fabric: 'Silk', sizes: FREE, photos: {'Royal Blue': 'paithani-saree-blue'}, desc: 'Hand-woven Yeola Paithani in royal blue with a gold zari border and a peacock-and-lotus pallu. Comes with an unstitched blouse piece.', tags: ['saree', 'silk saree', 'paithani', 'wedding']},
            {name: 'Banarasi Silk Saree', sub: 'Sarees', brand: 'Matoshri Label', gender: 'WOMEN', mrp: 9999, price: 7999, fabric: 'Silk', sizes: FREE, photos: {Maroon: 'banarasi-saree-maroon'}, desc: 'Deep maroon Banarasi with dense zari and sequin buttis. A bridal favourite. Blouse piece included.', tags: ['saree', 'silk saree', 'banarasi', 'bridal']},
            {name: 'Patola Silk Saree', sub: 'Sarees', brand: 'Desi Roots', gender: 'WOMEN', mrp: 18999, price: 14999, fabric: 'Silk', sizes: FREE, photos: {Red: 'patola-saree-red'}, desc: 'Double-ikat Patola with elephant and parrot motifs, woven in Patan. Every piece is slightly different.', tags: ['saree', 'silk saree', 'patola', 'ikat', 'heirloom']},
            {name: 'Tissue Silk Saree', sub: 'Sarees', brand: 'Urban Weave', gender: 'WOMEN', mrp: 6499, price: 4999, fabric: 'Tissue Silk', sizes: FREE, photos: {Peach: 'tissue-saree-peach'}, desc: 'Featherlight peach tissue with a woven checked pallu. Shines softly in daylight.', tags: ['saree', 'silk saree', 'tissue', 'day wedding']},
        ],
    },
    {
        name: 'Accessories',
        subs: ['Dupattas', 'Shawls'],
        items: [
            {name: 'Phulkari Dupatta', sub: 'Dupattas', brand: 'Desi Roots', gender: 'WOMEN', mrp: 1999, price: 1499, fabric: 'Cotton', sizes: FREE, photos: {Pink: 'phulkari-pink', Red: 'phulkari-red'}, desc: 'Punjabi phulkari with silk-floss darning stitch on hand-spun cotton. Instantly lifts a plain kurta.', tags: ['dupatta', 'phulkari', 'embroidered']},
            {name: 'Bagh Phulkari Dupatta', sub: 'Dupattas', brand: 'Desi Roots', gender: 'WOMEN', mrp: 3299, price: 2499, fabric: 'Cotton', sizes: FREE, photos: {Maroon: 'bagh-phulkari-maroon'}, desc: 'A "garden" phulkari: geometric embroidery so dense the base cloth barely shows.', tags: ['dupatta', 'phulkari', 'heirloom']},
            {name: 'Kashmiri Paisley Shawl', sub: 'Shawls', brand: 'Matoshri Label', gender: 'UNISEX', mrp: 4999, price: 3999, fabric: 'Wool', sizes: FREE, photos: {Red: 'paisley-shawl-red', Black: 'paisley-shawl-black', Ivory: 'paisley-shawl-ivory'}, desc: 'Soft wool shawl woven with the classic Kashmiri paisley (kani) pattern. 2 × 1 metres.', tags: ['shawl', 'kashmiri', 'paisley', 'winter']},
            {name: 'Ikat Silk Dupatta', sub: 'Dupattas', brand: 'Urban Weave', gender: 'WOMEN', mrp: 2299, price: 1799, fabric: 'Silk', sizes: FREE, photos: {Red: 'ikat-dupatta-red'}, desc: 'Red silk dupatta with an ikat border and checked body, finished with hand-knotted tassels.', tags: ['dupatta', 'ikat', 'silk']},
        ],
    },
    {
        name: 'Men',
        subs: ['Kurtas', 'Shirts', 'Trousers', 'Waistcoats'],
        items: [
            {name: 'Silk Long Kurta', sub: 'Kurtas', brand: 'Desi Roots', gender: 'MEN', mrp: 2999, price: 2499, fabric: 'Silk', sizes: ['M', 'L', 'XL', 'XXL'], photos: {Green: 'silk-kurta-green'}, desc: 'Pista-green silk kurta, calf length, with woven red-and-gold bands on the sleeves.', tags: ['kurta', 'silk', 'festive']},
            {name: 'Woven Long Kurta', sub: 'Kurtas', brand: 'Desi Roots', gender: 'MEN', mrp: 2499, price: 1999, fabric: 'Cotton Silk', sizes: ['M', 'L', 'XL', 'XXL'], photos: {Maroon: 'long-kurta-maroon'}, desc: 'Deep maroon cotton-silk kurta with a fine self-weave and short side slits.', tags: ['kurta', 'festive']},
            {name: 'Embroidered Cotton Shirt', sub: 'Shirts', brand: 'Matoshri Label', gender: 'MEN', mrp: 1599, price: 1299, fabric: 'Cotton', sizes: ['S', 'M', 'L', 'XL', 'XXL'], photos: {White: 'embroidered-shirt-white'}, desc: 'White cotton shirt with black hand-embroidered bands on the sleeves and yoke.', tags: ['shirt', 'cotton', 'embroidered']},
            {name: 'Ruffle-front Cotton Shirt', sub: 'Shirts', brand: 'Urban Weave', gender: 'MEN', mrp: 1899, price: 1499, fabric: 'Cotton', sizes: ['S', 'M', 'L', 'XL'], photos: {White: 'ruffle-shirt-white'}, desc: 'Fine white cotton with a ruffled placket and lace cuffs. A statement shirt for sherwani-free weddings.', tags: ['shirt', 'party wear']},
            {name: 'Checked Waistcoat', sub: 'Waistcoats', brand: 'Urban Weave', gender: 'MEN', mrp: 2299, price: 1799, fabric: 'Cotton', sizes: ['S', 'M', 'L', 'XL'], photos: {Blue: 'checked-waistcoat-blue'}, desc: 'Blue gingham waistcoat with a welt pocket. Wear it over a kurta or a white shirt.', tags: ['waistcoat', 'nehru jacket']},
            {name: 'Cotton Trousers', sub: 'Trousers', brand: 'Urban Weave', gender: 'MEN', mrp: 1599, price: 1299, fabric: 'Cotton', sizes: ['30', '32', '34', '36'], photos: {Beige: 'cotton-trousers-beige'}, desc: 'Straight-leg beige cotton trousers with a buckle-back waist. Smart enough for the office.', tags: ['trousers', 'cotton', 'formal'], fit: 'Straight'},
            {name: 'Checked Wool Trousers', sub: 'Trousers', brand: 'Urban Weave', gender: 'MEN', mrp: 2199, price: 1699, fabric: 'Wool', sizes: ['30', '32', '34', '36'], photos: {Brown: 'checked-trousers-brown'}, desc: 'Brown windowpane-check trousers in a soft wool blend, cut straight.', tags: ['trousers', 'wool', 'winter'], fit: 'Straight'},
        ],
    },
    {
        name: 'Kids',
        subs: ['Frocks', 'Shorts'],
        items: [
            {name: 'Velvet Party Frock', sub: 'Frocks', brand: 'Little Petals', gender: 'KIDS', mrp: 2499, price: 1999, fabric: 'Velvet', sizes: KIDS, photos: {Ruby: 'velvet-frock-ruby'}, desc: 'Ruby velvet frock with silver zari scrolls, puff sleeves and a soft satin lining that will not scratch.', tags: ['frock', 'party wear', 'velvet']},
            {name: 'Cotton Shorts', sub: 'Shorts', brand: 'Little Petals', gender: 'KIDS', mrp: 699, price: 499, fabric: 'Cotton', sizes: KIDS, photos: {White: 'cotton-shorts-white'}, desc: 'Soft white cotton shorts with a button waist. Everyday play wear.', tags: ['shorts', 'cotton', 'daily wear']},
        ],
    },
];

// Which shop sells which category
const SHOP_OF: Record<string, 'WW' | 'MW' | 'KW'> = {Women: 'WW', Ethnic: 'WW', Accessories: 'WW', Men: 'MW', Kids: 'KW'};

/** Rename a login so a new demo can use the number/email again (nothing is deleted) */
const archiveUser = (u: {id: string; phoneNumber: string; email: string | null}, stamp: string) =>
    prisma.user.update({
        where: {id: u.id},
        data: {
            phoneNumber: `arch${stamp}-${u.phoneNumber}`,
            username: null,
            email: u.email ? `archived.${stamp}.${u.email}` : null,
            status: AccountStatus.BLOCKED,
            refreshToken: null,
            sessionsRevokedAt: new Date(),
        },
    });

const archive = async () => {
    const stamp = Date.now().toString(36);
    const company = await prisma.company.findFirst({where: {email: COMPANY_EMAIL, deletedAt: null}});
    if (company) {
        for (const u of await prisma.user.findMany({where: {companyId: company.id}, select: {id: true, phoneNumber: true, email: true}})) {
            await archiveUser(u, stamp);
        }
        await prisma.product.updateMany({where: {companyId: company.id}, data: {status: ProductStatus.UNPUBLISHED}});
        await prisma.company.update({
            where: {id: company.id},
            data: {status: 'INACTIVE', name: `${company.name} (archived ${stamp})`, email: `archived.${stamp}.${company.email}`, contactNumber: `arch${stamp}`},
        });
        log(`Archived old demo company ${company.code}`);
    }
    for (const u of await prisma.user.findMany({where: {phoneNumber: {in: CUSTOMER_PHONES}, role: Role.USER}, select: {id: true, phoneNumber: true, email: true}})) {
        await archiveUser(u, stamp);
        log(`Archived old demo customer ${u.phoneNumber}`);
    }
};

const remove = async () => {
    const company = await prisma.company.findFirst({where: {email: COMPANY_EMAIL, deletedAt: null}});
    if (!company) return log('No demo company found.');
    await prisma.$transaction([
        prisma.product.updateMany({where: {companyId: company.id}, data: {status: ProductStatus.UNPUBLISHED}}),
        prisma.user.updateMany({where: {companyId: company.id}, data: {status: AccountStatus.BLOCKED}}),
        prisma.user.updateMany({where: {phoneNumber: {in: CUSTOMER_PHONES}, role: Role.USER}, data: {status: AccountStatus.BLOCKED}}),
        prisma.company.update({where: {id: company.id}, data: {status: 'INACTIVE'}}),
        prisma.coupon.updateMany({where: {code: {in: COUPONS}}, data: {isActive: false}}),
    ]);
    log('Demo company switched off: products unpublished, logins blocked, demo coupons off.');
};

const seed = async () => {
    if (await prisma.company.findFirst({where: {email: COMPANY_EMAIL, deletedAt: null}})) {
        return log('Demo company already exists — nothing to do. (Use --replace for a fresh one, --remove to switch it off.)');
    }

    // ---- Company, branch, shops (with their logins)
    const company = await companyService.createCompany(
        companyValidation.createCompanySchema.parse({
            name: 'Matoshri Fashions', email: COMPANY_EMAIL, contactNumber: '9800000100', postalCode: '416416',
            state: 'Maharashtra', district: 'Sangli', city: 'Sangli', address: 'Station Road, Sangli',
            adminName: 'Asha Patwardhan', adminEmail: 'owner@matoshri.demo', adminPhone: '9800000101', adminPassword: PASSWORD,
        }),
    );
    const owner = await prisma.user.findFirstOrThrow({where: {companyId: company.id, role: Role.ADMIN}});
    log(`Company ${company.name} (${company.code}) · company admin 9800000101`);

    const branch = await branchService.create(
        company.id,
        orgValidation.createBranchSchema.parse({
            name: 'Sangli Branch', postalCode: '416416', state: 'Maharashtra', district: 'Sangli', city: 'Sangli',
            address: 'Station Road, Sangli', openingTime: '10:00', closingTime: '21:00', weeklyHolidays: [],
            adminName: 'Vikram Kulkarni', adminEmail: 'branch@matoshri.demo', adminPhone: '9800000102', adminPassword: PASSWORD,
        }),
        owner.id,
    );
    log('Branch Sangli · branch admin 9800000102');

    const shopDefs = [
        {key: 'WW', name: "Women's Wear", phone: '9800000103'},
        {key: 'MW', name: "Men's Wear", phone: '9800000104'},
        {key: 'KW', name: 'Kids Wear', phone: '9800000105'},
    ] as const;
    const shops: Record<string, {id: string; adminId: string}> = {};
    for (const s of shopDefs) {
        const shop = await shopService.create(
            {companyId: company.id},
            orgValidation.createShopSchema.parse({
                name: s.name, shopType: s.name, branchId: branch.id, billPrefix: s.key,
                adminName: `${s.name.split("'")[0]} Counter`.replace(/[^A-Za-z .'-]/g, ''), adminPhone: s.phone, adminPassword: PASSWORD,
            }),
            owner.id,
        );
        const admin = await prisma.user.findFirstOrThrow({where: {shopId: shop.id, role: Role.SHOP_ADMIN}});
        shops[s.key] = {id: shop.id, adminId: admin.id};
        log(`Shop ${s.name} · login ${s.phone}`);
    }
    const scope = (key: string) => ({companyId: company.id, shopId: shops[key].id});

    // ---- Masters (company-wide), brands
    const sizeIds: Record<string, string> = {};
    const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '36', '2Y', '4Y', '6Y', '8Y', 'Free'];
    for (const [i, name] of SIZES.entries()) {
        sizeIds[name] = (await masterService.createSize(company.id, masterValidation.createSizeSchema.parse({name, displayOrder: i}))).id;
    }
    const colorIds: Record<string, string> = {};
    for (const [name, hexCode] of Object.entries(COLORS)) {
        colorIds[name] = (await masterService.createColor(company.id, masterValidation.createColorSchema.parse({name, hexCode}))).id;
    }
    const brandIds: Record<string, string> = {};
    for (const name of ['Matoshri Label', 'Urban Weave', 'Little Petals', 'Desi Roots']) {
        const code = `${company.code}-${name.toUpperCase().replace(/[^A-Z]+/g, '-')}`.slice(0, 40);
        brandIds[name] = (await prisma.brand.create({data: {name, code, companyId: company.id}})).id;
    }

    // ---- Categories and products, with their photos
    const products: {id: string; shop: string; cat: string; item: Item}[] = [];
    let photoCount = 0;
    for (const [ci, cat] of CATEGORIES.entries()) {
        const category = await masterService.createCategory(company.id, masterValidation.createCategorySchema.parse({name: cat.name, displayOrder: ci}));
        const subIds: Record<string, string> = {};
        for (const sub of cat.subs) {
            subIds[sub] = (await masterService.createSubcategory(company.id, masterValidation.createSubcategorySchema.parse({name: sub, categoryId: category.id}))).id;
        }
        for (const item of cat.items) {
            const shopKey = SHOP_OF[cat.name];
            const colours = Object.keys(item.photos);
            const p = await shopProductService.create(
                scope(shopKey),
                shops[shopKey].adminId,
                shopProductValidation.createShopProductSchema.parse({
                    name: item.name, detailedDesc: item.desc, shortDesc: item.desc.split('.')[0],
                    categoryId: category.id, subcategoryId: subIds[item.sub],
                    sizeIds: item.sizes.map((s) => sizeIds[s]), colorIds: colours.map((c) => colorIds[c]),
                    mrp: item.mrp, sellingPrice: item.price, stockQuantity: 0, status: 'PUBLISHED',
                    gender: item.gender, fabric: item.fabric, tags: item.tags, taxRate: item.price > 1000 ? 12 : 5,
                    careInstructions: ['Silk', 'Art Silk', 'Tissue Silk', 'Brocade', 'Velvet', 'Wool', 'Lace'].includes(item.fabric) ? 'Dry clean only' : 'Hand wash cold, dry in shade',
                    fit: item.fit ?? 'Regular',
                }),
            );
            await prisma.product.update({where: {id: p.id}, data: {brandId: brandIds[item.brand], returnEligible: true, returnPeriodDays: 7}});

            // Gallery: every colour's photos, first colour first; each colour's variants show its own photo
            let order = 0;
            for (const colour of colours) {
                const files = MANIFEST[item.photos[colour]];
                if (!files?.length) throw new Error(`No photos for ${item.photos[colour]}`);
                for (const [fi, file] of files.entries()) {
                    await prisma.productImage.create({
                        data: {
                            productId: p.id, url: photoUrl(file), order: order, isMain: order === 0,
                            altText: `${item.name} in ${colour.toLowerCase()}${files.length > 1 ? `, view ${fi + 1}` : ''}`,
                        },
                    });
                    order++;
                    photoCount++;
                }
                await prisma.productVariant.updateMany({where: {productId: p.id, color: colour}, data: {image: photoUrl(files[0])}});
            }
            products.push({id: p.id, shop: shopKey, cat: cat.name, item});
        }
        log(`Category ${cat.name}: ${cat.items.length} products`);
    }
    log(`${photoCount} product photos attached`);

    // ---- Purchase bills put stock in (one per supplier)
    const variantsOf = (productId: string) =>
        prisma.productVariant.findMany({where: {productId, isActive: true}, select: {id: true, size: true, color: true}, orderBy: {createdAt: 'asc'}});
    const suppliers = [
        {name: 'Surat Textile House', shop: 'WW', cats: ['Women']},
        {name: 'Kanchi Silks', shop: 'WW', cats: ['Ethnic', 'Accessories']},
        {name: 'Tiruppur Knits', shop: 'MW', cats: ['Men']},
        {name: 'Little Threads Wholesale', shop: 'KW', cats: ['Kids']},
    ];
    for (const [i, sup] of suppliers.entries()) {
        const lines = [];
        for (const prod of products.filter((p) => sup.cats.includes(p.cat))) {
            for (const [vi, v] of (await variantsOf(prod.id)).entries()) {
                // The last variant of each product is kept low to show "only a few left"
                const quantity = vi === 0 ? 3 : 8 + ((vi * 3) % 7);
                lines.push({variantId: v.id, quantity, unitCost: Math.round(prod.item.price * 0.55), taxRate: prod.item.price > 1000 ? 12 : 5});
            }
        }
        const bill = await billService.createPurchase(
            scope(sup.shop),
            shops[sup.shop].adminId,
            billValidation.createPurchaseBillSchema.parse({
                supplierName: sup.name, supplierPhone: `98000002${String(50 + i)}`, supplierInvoiceNo: `INV-${1001 + i}`,
                items: lines, amountPaid: i % 2 === 0 ? undefined : 0, paymentMode: 'UPI',
            }),
        );
        log(`Purchase ${bill.billNumber} from ${sup.name}: ${lines.length} lines, ₹${bill.totalAmount.toLocaleString('en-IN')}`);
    }

    const product = (name: string) => {
        const p = products.find((x) => x.item.name === name);
        if (!p) throw new Error(`Unknown demo product ${name}`);
        return p;
    };
    const variant = async (name: string, size?: string, colour?: string) => {
        const p = product(name);
        const all = await variantsOf(p.id);
        const v = all.find((x) => (!size || x.size === size) && (!colour || x.color === colour)) ?? all[1] ?? all[0];
        return {...p, variantId: v.id};
    };

    // ---- A few counter sales (cash, UPI, one on credit)
    const sales = [
        {shop: 'WW', name: 'Mirror-work Silk Kurti', size: 'L', qty: 2, method: 'CASH', customer: null},
        {shop: 'WW', name: 'Banarasi Silk Saree', qty: 1, method: 'UPI', customer: null},
        {shop: 'MW', name: 'Cotton Trousers', size: '32', qty: 2, method: 'CASH', customer: null},
        {shop: 'KW', name: 'Velvet Party Frock', size: '6Y', qty: 1, method: 'CREDIT', customer: {name: 'Sunita More', phone: '9800000301'}},
    ];
    for (const s of sales) {
        const v = await variant(s.name, s.size);
        const bill = await billService.createSales(
            scope(s.shop),
            shops[s.shop].adminId,
            billValidation.createSalesBillSchema.parse({
                paymentMethod: s.method, customerName: s.customer?.name, customerPhone: s.customer?.phone,
                items: [{variantId: v.variantId, quantity: s.qty, unitPrice: v.item.price, taxRate: v.item.price > 1000 ? 12 : 5}],
            }),
        );
        log(`Sale ${bill.billNumber}: ${s.qty} × ${s.name} (${s.method})`);
    }

    // ---- Coupons shown on the store
    const in60 = new Date(Date.now() + 60 * DAY);
    const coupons = [
        {code: 'FESTIVE10', name: '10% off', description: 'Extra 10% off, up to ₹500', type: 'PERCENTAGE' as const, discountValue: 10, maxDiscountLimit: 500, minPurchaseAmount: 1499},
        {code: 'WELCOME200', name: '₹200 off', description: '₹200 off your first order above ₹999', type: 'FLAT' as const, discountValue: 200, minPurchaseAmount: 999},
        {code: 'SAREE500', name: '₹500 off on silk sarees', description: 'Saree week · min ₹3,999', type: 'FLAT' as const, discountValue: 500, minPurchaseAmount: 3999},
        {code: 'KIDS20', name: '20% off party wear', description: 'Kids week · max ₹400', type: 'PERCENTAGE' as const, discountValue: 20, maxDiscountLimit: 400, minPurchaseAmount: 0},
    ];
    for (const c of coupons) {
        await prisma.coupon.upsert({
            where: {code: c.code},
            create: {...c, startDate: new Date(), endDate: in60, companyId: company.id, perCustomerLimit: 3},
            update: {isActive: true, endDate: in60, companyId: company.id, usedCount: 0},
        });
    }
    log(`Coupons: ${COUPONS.join(', ')}`);

    // ---- Customers
    const customers = [
        {fullname: 'Kavita Desai', email: 'kavita@demo.clothpro.in', phone: '9800000200', gender: 'WOMAN', dob: '1991-08-14', addr: {address1: '12, Vishrambag', address2: 'Near Ganpati Mandir', city: 'Sangli'}},
        {fullname: 'Rohan Joshi', email: 'rohan@demo.clothpro.in', phone: '9800000201', gender: 'MAN', dob: '1988-02-03', addr: {address1: '4B, Shivaji Nagar', address2: 'Opp. Bus Stand', city: 'Miraj'}},
        {fullname: 'Sneha Patil', email: 'sneha@demo.clothpro.in', phone: '9800000202', gender: 'WOMAN', dob: '1995-11-21', addr: {address1: '7, Gaonbhag', address2: 'Behind Vishnu Mandir', city: 'Sangli'}},
        {fullname: 'Meera Iyer', email: 'meera@demo.clothpro.in', phone: '9800000203', gender: 'WOMAN', dob: '1984-06-09', addr: {address1: 'Flat 302, Sai Residency', address2: 'Kupwad Road', city: 'Sangli'}},
    ];
    const people: Record<string, {id: string; homeId: string}> = {};
    for (const c of customers) {
        const u = await prisma.user.create({
            data: {
                fullname: c.fullname, email: c.email, phoneNumber: c.phone, username: c.phone, password: await encryptPassword(PASSWORD),
                role: Role.USER, isVerified: true, status: AccountStatus.ACTIVE, gender: c.gender, dateOfBirth: new Date(c.dob),
            },
        });
        const home = await customerService.saveAddress(u.id, {
            recipient: c.fullname, phone: c.phone, postalCode: '416416', ...c.addr, district: 'Sangli', state: 'Maharashtra', label: 'HOME', isDefault: true,
        });
        people[c.phone] = {id: u.id, homeId: home.id};
    }
    const kavita = people['9800000200'];
    await customerService.saveAddress(kavita.id, {
        recipient: 'Kavita Desai', phone: '9800000200', postalCode: '416416', address1: 'Office 4, College Corner', address2: 'Rajwada Chowk',
        city: 'Sangli', district: 'Sangli', state: 'Maharashtra', label: 'WORK', isDefault: false,
    });
    await customerService.saveAddress(kavita.id, {
        recipient: 'Sudha Desai', phone: '9800000210', postalCode: '411004', address1: '18, Prabhat Road', address2: 'Lane 5, Deccan Gymkhana',
        city: 'Pune', district: 'Pune', state: 'Maharashtra', label: 'OTHER', isDefault: false,
    });

    // ---- Orders, moved through the shop's real order flow
    type Line = {name: string; size?: string; colour?: string; qty?: number};
    const place = async (phone: string, lines: Line[], opts: {coupon?: string; delivery?: 'STANDARD' | 'EXPRESS'} = {}) => {
        const who = people[phone];
        await prisma.cartItem.deleteMany({where: {cart: {userId: who.id}}});
        for (const l of lines) {
            const v = await variant(l.name, l.size, l.colour);
            await customerService.addToCart(who.id, {variantId: v.variantId, quantity: l.qty ?? 1});
        }
        const placed = await checkoutService.checkout(who.id, {addressId: who.homeId, delivery: opts.delivery ?? 'STANDARD', paymentMethod: 'COD', couponCode: opts.coupon});
        // A bag with items from two shops becomes one order per shop
        const rows = await prisma.order.findMany({where: {id: {in: placed.orders.map((o) => o.id)}}, select: {id: true, orderNumber: true, shopId: true}});
        const keyOf = (shopId: string | null) => Object.keys(shops).find((k) => shops[k].id === shopId)!;
        return rows.map((o) => ({id: o.id, orderNumber: o.orderNumber, shop: keyOf(o.shopId), userId: who.id}));
    };
    const move = async (o: {id: string; shop: string}, to: OrderStatus) => {
        const s = scope(o.shop);
        const actor = shops[o.shop].adminId;
        const path: OrderStatus[] = [OrderStatus.CONFIRMED, OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED];
        for (const step of path.slice(0, path.indexOf(to) + 1)) {
            if (step === OrderStatus.SHIPPED) {
                await orderService.updateShipping(s, o.id, {courierName: 'Delhivery', trackingNumber: `DL${o.id.replace(/\D/g, '').slice(0, 10).padEnd(10, '7')}`}, actor);
            } else {
                await orderService.updateStatus(s, o.id, {status: step, comment: step === OrderStatus.PACKED ? 'Quality checked and packed' : undefined}, actor);
            }
        }
    };
    /** Spread what was just done for one order over a past period: placed `fromDays` ago, last update `toDays` ago */
    const backdate = async (orderId: string, userId: string, started: Date, fromDays: number, toDays: number) => {
        const t0 = started.getTime();
        const t1 = Date.now();
        const from = Date.now() - fromDays * DAY;
        const to = Date.now() - toDays * DAY;
        // Clamped: the database and Node clocks can differ by a few milliseconds
        const at = (d: Date) => {
            const ratio = Math.min(1, Math.max(0, (d.getTime() - t0) / Math.max(1, t1 - t0)));
            return new Date(Number.isFinite(ratio) ? from + ratio * (to - from) : to);
        };
        const order = await prisma.order.findUniqueOrThrow({where: {id: orderId}, select: {createdAt: true}});
        await prisma.order.update({where: {id: orderId}, data: {createdAt: at(order.createdAt), updatedAt: new Date(to)}});
        for (const h of await prisma.orderStatusHistory.findMany({where: {orderId}})) {
            await prisma.orderStatusHistory.update({where: {id: h.id}, data: {createdAt: at(h.createdAt)}});
        }
        for (const r of await prisma.returnRequest.findMany({where: {orderId}})) {
            await prisma.returnRequest.update({where: {id: r.id}, data: {createdAt: at(r.createdAt), updatedAt: new Date(to)}});
        }
        for (const n of await prisma.notification.findMany({where: {userId, createdAt: {gte: started}}})) {
            await prisma.notification.update({where: {id: n.id}, data: {createdAt: at(n.createdAt), readAt: toDays > 2 ? new Date(to) : null}});
        }
    };
    const story = async (phone: string, lines: Line[], to: OrderStatus | null, fromDays: number, toDays: number, extra?: (o: {id: string; shop: string; userId: string; orderNumber: string}) => Promise<unknown>, opts?: {coupon?: string; delivery?: 'STANDARD' | 'EXPRESS'}) => {
        const started = new Date();
        const placed = await place(phone, lines, opts);
        for (const o of placed) {
            if (to) await move(o, to);
            if (extra) await extra(o);
        }
        for (const o of placed) await backdate(o.id, o.userId, started, fromDays, toDays);
        return placed[0];
    };
    const returnOf = async (orderId: string) => prisma.returnRequest.findFirstOrThrow({where: {orderId}, orderBy: {createdAt: 'desc'}});
    const firstItem = async (orderId: string) => prisma.orderItem.findFirstOrThrow({where: {orderId}, orderBy: {totalPrice: 'desc'}});

    // Other customers: delivered orders, so their reviews count as verified purchases
    const reviewsBy: {phone: string; lines: Line[]; days: number; reviews: {name: string; rating: number; fit?: 'SMALL' | 'TRUE' | 'LARGE'; title: string; comment: string}[]}[] = [
        {phone: '9800000201', lines: [{name: 'Silk Long Kurta', size: 'L'}, {name: 'Checked Waistcoat', size: 'L'}], days: 24, reviews: [
            {name: 'Silk Long Kurta', rating: 5, fit: 'TRUE', title: 'Wore it for Diwali puja', comment: 'Lovely sheen, the sleeve bands look hand-woven. Got many compliments.'},
            {name: 'Checked Waistcoat', rating: 4, fit: 'SMALL', title: 'Smart, but runs small', comment: 'Looks great over a kurta. I am usually L and it is snug, take one size up.'},
        ]},
        {phone: '9800000201', lines: [{name: 'Cotton Trousers', size: '34'}, {name: 'Embroidered Cotton Shirt', size: 'L'}], days: 12, reviews: [
            {name: 'Cotton Trousers', rating: 4, fit: 'TRUE', title: 'Good office trousers', comment: 'Fabric breathes well. Length needed a small alteration.'},
            {name: 'Embroidered Cotton Shirt', rating: 5, fit: 'TRUE', title: 'Different from the usual', comment: 'The embroidery is neat and did not run in the wash.'},
        ]},
        {phone: '9800000202', lines: [{name: 'Digital Print Silk Lehenga', size: 'S', colour: 'Saffron'}, {name: 'Phulkari Dupatta', colour: 'Pink'}], days: 30, reviews: [
            {name: 'Digital Print Silk Lehenga', rating: 5, fit: 'TRUE', title: 'Perfect for my sangeet', comment: 'Colours are exactly like the photos and the flare is beautiful when you twirl. Blouse needed a small fitting.'},
            {name: 'Phulkari Dupatta', rating: 5, title: 'Gorgeous work', comment: 'Thread work is dense and bright. Worth every rupee.'},
        ]},
        {phone: '9800000202', lines: [{name: 'Mirror-work Silk Kurti', size: 'S', colour: 'Teal'}, {name: 'Victorian Cotton Blouse', size: 'S'}], days: 9, reviews: [
            {name: 'Mirror-work Silk Kurti', rating: 4, fit: 'LARGE', title: 'Beautiful yoke, slightly roomy', comment: 'The mirror work is lovely. It is a bit loose around the waist, size down if you are between sizes.'},
            {name: 'Victorian Cotton Blouse', rating: 3, fit: 'TRUE', title: 'Pretty but sheer', comment: 'Nice collar and sleeves, but you need a camisole underneath.'},
        ]},
        {phone: '9800000203', lines: [{name: 'Paithani Silk Saree'}, {name: 'Kashmiri Paisley Shawl', colour: 'Ivory'}], days: 40, reviews: [
            {name: 'Paithani Silk Saree', rating: 5, title: 'Real Yeola Paithani', comment: 'The pallu is stunning and the zari is heavy. Packed beautifully in a box.'},
            {name: 'Kashmiri Paisley Shawl', rating: 5, title: 'Soft and warm', comment: 'Bought for my mother. Very soft and the paisley is fine.'},
        ]},
        {phone: '9800000203', lines: [{name: 'Banarasi Silk Saree'}, {name: 'Velvet Party Frock', size: '4Y'}], days: 18, reviews: [
            {name: 'Banarasi Silk Saree', rating: 4, title: 'Rich colour', comment: 'Deep maroon, looks bridal. Slightly heavy for long hours.'},
            {name: 'Velvet Party Frock', rating: 5, fit: 'TRUE', title: 'My daughter loved it', comment: 'Lining is soft so she wore it the whole evening without fuss.'},
        ]},
    ];
    for (const r of reviewsBy) {
        await story(r.phone, r.lines, OrderStatus.DELIVERED, r.days + 5, r.days);
        for (const rv of r.reviews) {
            await customerService.review(people[r.phone].id, product(rv.name).id, {rating: rv.rating, title: rv.title, comment: rv.comment, fit: rv.fit ?? null, images: []});
        }
    }
    log(`Customers Rohan, Sneha, Meera · ${reviewsBy.length} delivered orders, ${reviewsBy.reduce((n, r) => n + r.reviews.length, 0)} reviews`);

    // Kavita's account shows every kind of order
    const K = '9800000200';
    const kOrders: string[] = [];
    // 1. Delivered a month ago (return window closed), reviewed
    const k1 = await story(K, [{name: 'Mirror-work Silk Kurti', size: 'M', colour: 'Green'}, {name: 'Phulkari Dupatta', colour: 'Red'}], OrderStatus.DELIVERED, 27, 22);
    kOrders.push(k1.orderNumber);
    await customerService.review(kavita.id, product('Mirror-work Silk Kurti').id, {rating: 5, fit: 'TRUE', title: 'Soft fabric, true to size', comment: 'The mirror work catches the light beautifully. Wore it to a haldi and got asked where it is from.', images: [photoUrl(MANIFEST['mirror-kurti-green'][1])]});
    await customerService.review(kavita.id, product('Phulkari Dupatta').id, {rating: 4, title: 'Bright and pretty', comment: 'Colour is a little brighter than the photo, which I liked. Some loose threads at the edge.', images: []});
    // 2. Refund completed: whole order returned
    const k2 = await story(K, [{name: 'Velvet Party Frock', size: '6Y'}], OrderStatus.DELIVERED, 19, 10, async (o) => {
        await storeOrders.requestReturn(kavita.id, o.id, {items: [{orderItemId: (await firstItem(o.id)).id, quantity: 1}], reason: 'Size too small', details: 'My niece has grown, 6Y is tight at the shoulders.', resolution: 'REFUND', images: []});
        const r = await returnOf(o.id);
        await orderService.updateReturnStatus(scope('KW'), r.id, {returnStatus: 'APPROVED'}, shops.KW.adminId);
        await orderService.updateReturnStatus(scope('KW'), r.id, {returnStatus: 'RECEIVED', restock: true}, shops.KW.adminId);
        await orderService.updateReturnStatus(scope('KW'), r.id, {returnStatus: 'COMPLETED', refundStatus: 'PROCESSED', notes: 'Refunded to UPI kavita@okaxis'}, shops.KW.adminId);
    });
    kOrders.push(k2.orderNumber);
    // 3. Delivered 4 days ago, blouse sent for exchange (approved)
    const k3 = await story(K, [{name: 'Victorian Cotton Blouse', size: 'S'}, {name: 'Lace Overlay Jacket', size: 'M'}], OrderStatus.DELIVERED, 9, 4, async (o) => {
        const blouse = await prisma.orderItem.findFirstOrThrow({where: {orderId: o.id, productName: 'Victorian Cotton Blouse'}});
        await storeOrders.requestReturn(kavita.id, o.id, {items: [{orderItemId: blouse.id, quantity: 1}], reason: 'Size too small', details: 'Tight across the shoulders.', resolution: 'EXCHANGE', exchangeFor: 'Size M', images: []});
        await orderService.updateReturnStatus(scope('WW'), (await returnOf(o.id)).id, {returnStatus: 'APPROVED'}, shops.WW.adminId);
    });
    kOrders.push(k3.orderNumber);
    // 4. Delivered 2 days ago: can still be returned and reviewed
    const k4 = await story(K, [{name: 'Digital Print Silk Lehenga', size: 'M', colour: 'Teal'}, {name: 'Kashmiri Paisley Shawl', colour: 'Red'}], OrderStatus.DELIVERED, 7, 2, undefined, {coupon: 'FESTIVE10'});
    kOrders.push(k4.orderNumber);
    // 5. Out for delivery today
    const k5 = await story(K, [{name: 'Paithani Silk Saree'}, {name: 'Ikat Silk Dupatta'}], OrderStatus.OUT_FOR_DELIVERY, 4, 0.1, undefined, {coupon: 'SAREE500'});
    kOrders.push(k5.orderNumber);
    // 6. Packed yesterday (men's shop: a kurta for her husband)
    const k6 = await story(K, [{name: 'Woven Long Kurta', size: 'XL'}], OrderStatus.PACKED, 1.5, 0.8);
    kOrders.push(k6.orderNumber);
    // 7. Just placed: can still be cancelled
    const k7 = await story(K, [{name: 'Embroidered Wool Jacket', size: 'M'}], null, 0.05, 0.04, undefined, {delivery: 'EXPRESS'});
    kOrders.push(k7.orderNumber);
    // 8. Cancelled by her last week
    const k8 = await story(K, [{name: 'Brocade Jacket Lehenga', size: 'M'}], null, 8, 7.9, (o) => storeOrders.cancel(kavita.id, o.id, 'Ordered the wrong size'));
    kOrders.push(k8.orderNumber);
    log(`Kavita's orders: ${kOrders.join(', ')}`);

    // Bag, wishlist, offers, a help message
    await prisma.cartItem.deleteMany({where: {cart: {userId: kavita.id}}});
    await customerService.addToCart(kavita.id, {variantId: (await variant('Brocade Peplum Jacket', 'M')).variantId, quantity: 1});
    await customerService.addToCart(kavita.id, {variantId: (await variant('Bagh Phulkari Dupatta')).variantId, quantity: 1});
    for (const name of ['Patola Silk Saree', 'Ombré Print Lehenga', 'Floral Embroidered Lehenga', 'Tissue Silk Saree']) {
        await customerService.addToWishlist(kavita.id, product(name).id);
    }
    const offers = [
        {days: 0.3, title: 'Saree week: ₹500 off', body: 'Use SAREE500 on silk sarees above ₹3,999. Paithani, Banarasi and Patola included.', link: '/products?category=Ethnic'},
        {days: 3, title: 'Festive edit is live', body: 'Lehengas, kurtis and dupattas picked for the wedding season. Extra 10% off with FESTIVE10.', link: '/products?q=festive'},
        {days: 12, title: 'Kids party wear: 20% off', body: 'Velvet frocks and more with KIDS20, up to ₹400 off.', link: '/products?category=Kids'},
    ];
    for (const o of offers) {
        const n = await notify(prisma, kavita.id, {type: 'OFFER', title: o.title, body: o.body, link: o.link});
        await prisma.notification.update({where: {id: n.id}, data: {createdAt: new Date(Date.now() - o.days * DAY), readAt: o.days > 2 ? new Date() : null}});
    }
    const welcome = await notify(prisma, kavita.id, {type: 'ACCOUNT', title: 'Welcome to Cloth Pro', body: 'Your account is ready. Save addresses and wishlist items to check out faster.', link: '/account/profile'});
    await prisma.notification.update({where: {id: welcome.id}, data: {createdAt: new Date(Date.now() - 45 * DAY), readAt: new Date()}});
    await storeAccount.support(kavita.id, {name: 'Kavita Desai', email: 'kavita@demo.clothpro.in', phone: '9800000200', topic: 'Size & fit', orderNumber: k3.orderNumber, message: 'Does the exchange blouse in M come with the same pin-tucks? Want to be sure before pickup.'});
    await prisma.cartItem.deleteMany({where: {cart: {userId: {in: ['9800000201', '9800000202', '9800000203'].map((p) => people[p].id)}}}});
    const unread = await prisma.notification.count({where: {userId: kavita.id, readAt: null}});
    log(`Kavita Desai · login 9800000200 · 2 items in bag, 4 in wishlist, ${unread} unread notifications`);
};

const main = async () => {
    const replace = process.argv.includes('--replace');
    console.log(process.argv.includes('--remove') ? 'Switching off demo data…' : replace ? 'Replacing demo data…' : 'Creating demo data…');
    if (process.argv.includes('--remove')) await remove();
    else {
        if (replace) await archive();
        await seed();
    }
    console.log(`Done. All demo logins use the password ${PASSWORD}`);
};

main()
    .catch((e) => {
        console.error('Demo seed failed:', e?.message ?? e, e?.errors ? JSON.stringify(e.errors) : '');
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
