import {z} from 'zod';

/*
 * Shared list helper: every list endpoint takes
 *   ?page&limit&search&sortBy&sortDir (+ its own filters)
 * and returns
 *   {items, pagination: {page, limit, total, totalPages}}
 */

export type ListQuery<S extends string = string> = {
    page: number;
    limit: number;
    search: string;
    sortBy: S;
    sortDir: 'asc' | 'desc';
};

/** Base query schema; `.extend({...})` it with module filters */
export const listQuerySchema = <S extends string>(
    sortFields: readonly [S, ...S[]],
    defaultSort: S,
) =>
    z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
        search: z.string().trim().max(100).optional().default(''),
        sortBy: z.enum(sortFields).default(defaultSort as never),
        sortDir: z.enum(['asc', 'desc']).default('desc'),
    });

/** Case-insensitive "contains" across the given fields, or undefined */
export const searchWhere = <F extends string>(search: string, fields: readonly F[]) =>
    search
        ? fields.map(
              (f) =>
                  ({[f]: {contains: search, mode: 'insensitive'}}) as {
                      [K in F]?: {contains: string; mode: 'insensitive'};
                  },
          )
        : undefined;

/** skip / take / orderBy for a Prisma findMany */
export const listArgs = <S extends string>({page, limit, sortBy, sortDir}: ListQuery<S>) => ({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {[sortBy]: sortDir} as Record<S, 'asc' | 'desc'>,
});

export const toListResult = <T>(
    items: T[],
    total: number,
    {page, limit}: Pick<ListQuery, 'page' | 'limit'>,
) => ({
    items,
    pagination: {page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit))},
});
