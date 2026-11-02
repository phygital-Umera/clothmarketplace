import {Role} from '@prisma/client';
import prisma from '../client';
import {PERMISSIONS} from '../config/permissions';

// Role permissions change rarely; cache them briefly so every request does not
// hit the database
const CACHE_MS = 60 * 1000;
const cache = new Map<Role, {permissions: string[]; loadedAt: number}>();

class PermissionService {
    public async getRolePermissions(role: Role): Promise<string[]> {
        const hit = cache.get(role);
        if (hit && Date.now() - hit.loadedAt < CACHE_MS) return hit.permissions;

        const rows = await prisma.rolePermission.findMany({
            where: {role},
            select: {permission: true},
        });
        const permissions = rows.map((r) => r.permission).sort();
        cache.set(role, {permissions, loadedAt: Date.now()});
        return permissions;
    }

    /** Grant SUPERADMIN every permission in the catalog (idempotent) */
    public async syncSuperAdmin() {
        const result = await prisma.rolePermission.createMany({
            data: PERMISSIONS.map((permission) => ({role: Role.SUPER_ADMIN, permission})),
            skipDuplicates: true,
        });
        cache.delete(Role.SUPER_ADMIN);
        return result.count;
    }
}

export default new PermissionService();
