import prisma from '../client';
import {BranchScope} from './customerDue.service';

export type OperatingHourDay = {
    day: string;
    open: boolean;
    from: string;
    to: string;
};

export type BranchHoliday = {
    id: string;
    name: string;
    dateDesc: string;
};

export type BranchProfileData = {
    identity: {
        branchName: string;
        branchCode: string;
        company: string;
        gstin: string;
    };
    contact: {
        email: string;
        phone: string;
        alternatePhone?: string;
        whatsapp?: string;
        address: string;
        city: string;
        pincode: string;
        mapsLink?: string;
    };
    operatingHours: OperatingHourDay[];
    holidays: BranchHoliday[];
    glance: {
        shops: number;
        employees: number;
        branchOpened: string;
        status: string;
    };
};

class BranchProfileSetupService {
    private tableEnsured = false;

    private async ensureTable() {
        if (this.tableEnsured) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "BranchProfileSetup" (
                    "id" TEXT PRIMARY KEY,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL UNIQUE,
                    "email" TEXT NOT NULL DEFAULT 'sangli@matoshri.in',
                    "phone" TEXT NOT NULL DEFAULT '+91 233 262 0011',
                    "alternatePhone" TEXT,
                    "whatsapp" TEXT,
                    "address" TEXT NOT NULL DEFAULT '[Shop no.] Station Road',
                    "city" TEXT NOT NULL DEFAULT 'Sangli',
                    "pincode" TEXT NOT NULL DEFAULT '416416',
                    "mapsLink" TEXT,
                    "operatingHours" JSONB,
                    "holidays" JSONB,
                    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            this.tableEnsured = true;
        } catch (e) {
            console.error('Error creating BranchProfileSetup table:', e);
        }
    }

    private async ensureSeedData(scope: BranchScope) {
        await this.ensureTable();
        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchProfileSetup" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10);
        if (count > 0) return;

        const defaultHours: OperatingHourDay[] = [
            {day: 'Monday', open: true, from: '10:00 AM', to: '09:00 PM'},
            {day: 'Tuesday', open: true, from: '10:00 AM', to: '09:00 PM'},
            {day: 'Wednesday', open: true, from: '10:00 AM', to: '09:00 PM'},
            {day: 'Thursday', open: true, from: '10:00 AM', to: '09:00 PM'},
            {day: 'Friday', open: true, from: '10:00 AM', to: '09:00 PM'},
            {day: 'Saturday', open: true, from: '10:00 AM', to: '10:00 PM'},
            {day: 'Sunday', open: true, from: '10:00 AM', to: '10:00 PM'},
        ];

        const defaultHolidays: BranchHoliday[] = [
            {id: '1', name: 'Diwali – Laxmi Pujan', dateDesc: 'Fri 20 Nov 2026 · closes 14:00'},
            {id: '2', name: 'Annual stock count', dateDesc: 'Sun 29 Nov 2026 · closed'},
        ];

        await prisma.$executeRawUnsafe(
            `INSERT INTO "BranchProfileSetup" (
                "id", "companyId", "branchId", "email", "phone", "address",
                "city", "pincode", "operatingHours", "holidays"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
            ON CONFLICT ("branchId") DO NOTHING`,
            `bps-${scope.branchId}`,
            scope.companyId,
            scope.branchId,
            'sangli@matoshri.in',
            '+91 233 262 0011',
            '[Shop no.] Station Road',
            'Sangli',
            '416416',
            JSON.stringify(defaultHours),
            JSON.stringify(defaultHolidays),
        );
    }

    public async getProfile(scope: BranchScope): Promise<BranchProfileData> {
        await this.ensureSeedData(scope);

        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchProfileSetup" WHERE "branchId" = $1`,
            scope.branchId,
        );

        const r = rows[0] || {};
        const hours = r.operatingHours || [
            {day: 'Monday', open: true, from: '10:00 AM', to: '09:00 PM'},
            {day: 'Tuesday', open: true, from: '10:00 AM', to: '09:00 PM'},
            {day: 'Wednesday', open: true, from: '10:00 AM', to: '09:00 PM'},
            {day: 'Thursday', open: true, from: '10:00 AM', to: '09:00 PM'},
            {day: 'Friday', open: true, from: '10:00 AM', to: '09:00 PM'},
            {day: 'Saturday', open: true, from: '10:00 AM', to: '10:00 PM'},
            {day: 'Sunday', open: true, from: '10:00 AM', to: '10:00 PM'},
        ];

        const holidays = r.holidays || [
            {id: '1', name: 'Diwali – Laxmi Pujan', dateDesc: 'Fri 20 Nov 2026 · closes 14:00'},
            {id: '2', name: 'Annual stock count', dateDesc: 'Sun 29 Nov 2026 · closed'},
        ];

        return {
            identity: {
                branchName: 'Sangli Branch',
                branchCode: 'MAT-B02',
                company: 'Matoshri Fashions',
                gstin: '27ABCDE1234F1Z5',
            },
            contact: {
                email: r.email || 'sangli@matoshri.in',
                phone: r.phone || '+91 233 262 0011',
                alternatePhone: r.alternatePhone || '',
                whatsapp: r.whatsapp || '',
                address: r.address || '[Shop no.] Station Road',
                city: r.city || 'Sangli',
                pincode: r.pincode || '416416',
                mapsLink: r.mapsLink || '',
            },
            operatingHours: hours,
            holidays,
            glance: {
                shops: 3,
                employees: 14,
                branchOpened: '01 Nov 2026',
                status: 'ACTIVE',
            },
        };
    }

    public async updateProfile(scope: BranchScope, payload: any) {
        await this.ensureTable();
        await prisma.$executeRawUnsafe(
            `UPDATE "BranchProfileSetup"
             SET "email" = $1, "phone" = $2, "alternatePhone" = $3, "whatsapp" = $4,
                 "address" = $5, "city" = $6, "pincode" = $7, "mapsLink" = $8,
                 "operatingHours" = $9::jsonb, "holidays" = $10::jsonb, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "branchId" = $11`,
            payload.contact?.email || 'sangli@matoshri.in',
            payload.contact?.phone || '+91 233 262 0011',
            payload.contact?.alternatePhone || null,
            payload.contact?.whatsapp || null,
            payload.contact?.address || '[Shop no.] Station Road',
            payload.contact?.city || 'Sangli',
            payload.contact?.pincode || '416416',
            payload.contact?.mapsLink || null,
            JSON.stringify(payload.operatingHours || []),
            JSON.stringify(payload.holidays || []),
            scope.branchId,
        );

        return {success: true, message: 'Branch profile updated successfully'};
    }
}

export default new BranchProfileSetupService();

