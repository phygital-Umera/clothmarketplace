import {NextFunction, Request, Response} from 'express';
import {AuditResult, Role} from '@prisma/client';
import auditService from '../services/audit.service';

/*
 * Every staff write leaves an audit row. Handlers that write their own
 * (auditService.track, or fromRequest) mark the request and are skipped;
 * the rest get one generic row: "PATCH shop-admin/orders/:id/status" with
 * the request body (credentials removed by the audit service).
 */
const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PANELS = new Set(['super-admin', 'company-admin', 'branch-admin', 'shop-admin', 'employee']);
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const MAX_BODY = 10_000;

const bodyOf = (body: unknown) => {
    if (body === undefined || body === null) return undefined;
    const size = JSON.stringify(body).length;
    return size > MAX_BODY ? {omitted: `request body of ${size} characters`} : body;
};

export const auditWrites = (req: Request, res: Response, next: NextFunction) => {
    if (!WRITES.has(req.method)) return next();
    res.on('finish', () => {
        const actor = req.user;
        // Sign-in pages have no user yet; a customer's bag and wishlist are not audited
        if (!actor || actor.role === Role.USER || res.locals.audited) return;
        // Bad input or a missing record: nothing changed. Refusals (403) are kept
        if (res.statusCode >= 400 && res.statusCode !== 403) return;
        const path = req.originalUrl.split('?')[0].replace(/^\/api\/v1\//, '');
        const [first, second] = path.split('/');
        void auditService.log({
            ...auditService.fromRequest(req),
            action: `${req.method} ${path.replace(UUID, ':id')}`,
            module: (PANELS.has(first) && second) || first,
            targetId: path.match(UUID)?.[0],
            companyId: actor.companyId,
            result: res.statusCode < 400 ? AuditResult.SUCCESS : AuditResult.FAILURE,
            reason: res.statusCode < 400 ? undefined : 'Refused (403)',
            after: {request: bodyOf(req.body)},
        });
    });
    next();
};
