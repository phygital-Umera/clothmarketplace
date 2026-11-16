import {File} from 'multer';
import {Role} from '@prisma/client';

declare global {
    namespace Express {
        interface Request {
            user: {
                id: string;
                username?: string | null;
                email?: string | null;
                fullname: string;
                role: Role;
                /** Set in shop mode: the company admin (ADMIN) acting as SHOP_ADMIN */
                realRole?: Role;
                phoneNumber: string;
                adminId?: string;
                employeeId?: string;
                /** COMPANY_ADMIN: the company they sign in for */
                companyId?: string | null;
                /** BRANCH_ADMIN / EMPLOYEE: the branch they work for */
                branchId?: string | null;
                /** SHOP_ADMIN / EMPLOYEE: the shop they work in */
                shopId?: string | null;
                /** Loaded by verifyJWT from the role's RolePermission rows */
                permissions: string[];
                // languageId?: string;
            };
            file?: File;
            files?:
                | {
                      [fieldname: string]: Express.Multer.File[];
                  }
                | Express.Multer.File[];
        }
    }
}
