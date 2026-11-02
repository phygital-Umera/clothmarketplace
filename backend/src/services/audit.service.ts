import {AuditResult, Prisma} from '@prisma/client';
import {Request} from 'express';
import prisma from '../client';
import {logger} from '@config/index';
import {ZodError} from 'zod';

export type AuditEntry = {
    actor?: Request['user'];
    action: string;
    module: string;
    targetId?: string | null;
    companyId?: string | null;
    result?: AuditResult;
    reason?: string | null;
    before?: unknown;
    after?: unknown;
    ip?: string;
    userAgent?: string;
};

// Anything that looks like a credential never reaches the audit table
const SECRET_KEY = /pass(word)?|token|secret|verifyCode|otp|apiKey|^key$|extendKey/i;

const redact = (value: unknown): Prisma.InputJsonValue | undefined => {
    if (value === undefined || value === null) return undefined;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((v) => redact(v) ?? null) as Prisma.InputJsonValue;
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([key]) => !SECRET_KEY.test(key))
                .map(([key, v]) => [key, redact(v) ?? null]),
        );
    }
    return value as Prisma.InputJsonValue;
};

class AuditService {
    /**
     * Append one audit row. Logging must never break the action it records,
     * so failures are reported to the app log and swallowed.
     */
    public async log(entry: AuditEntry) {
        try {
            await prisma.auditLog.create({
                data: {
                    actorId: entry.actor?.id,
                    actorName: entry.actor?.fullname,
                    actorRole: entry.actor?.role,
                    action: entry.action,
                    module: entry.module,
                    targetId: entry.targetId ?? undefined,
                    companyId: entry.companyId ?? undefined,
                    result: entry.result ?? AuditResult.SUCCESS,
                    reason: entry.reason ?? undefined,
                    before: redact(entry.before),
                    after: redact(entry.after),
                    ip: entry.ip,
                    userAgent: entry.userAgent?.slice(0, 300),
                },
            });
        } catch (error) {
            logger.error(`Audit log write failed for ${entry.action}: ${(error as Error).message}`);
        }
    }

    /**
     * Run a change and write one audit row for it: SUCCESS with before/after,
     * or FAILURE with the error message. Plain validation errors (400) are not
     * audited, since nothing was attempted.
     */
    public async track<T extends {before?: unknown; after?: unknown}>(
        req: Request,
        meta: {
            action: string;
            module: string;
            targetId?: string;
            companyId?: string | null;
            reason?: string;
        },
        run: () => Promise<T>,
    ): Promise<T> {
        const base = {
            ...this.fromRequest(req),
            ...meta,
            companyId: meta.companyId ?? req.user?.companyId,
        };
        try {
            const result = await run();
            const after = result.after as {id?: string} | undefined;
            await this.log({
                ...base,
                targetId: meta.targetId ?? after?.id,
                before: result.before,
                after: result.after,
            });
            return result;
        } catch (error) {
            if (!(error instanceof ZodError)) {
                await this.log({
                    ...base,
                    result: AuditResult.FAILURE,
                    reason: (error as Error).message,
                });
            }
            throw error;
        }
    }

    /** Actor, IP and user agent from the request */
    public fromRequest(req: Request) {
        return {actor: req.user, ip: req.ip, userAgent: req.get('user-agent')};
    }
}

export default new AuditService();
