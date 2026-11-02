import {Request} from 'express';
import httpStatus from 'http-status';
import {ZodError} from 'zod';
import {AuditResult} from '@prisma/client';
import {auditService, companyService} from '@services/index';
import {catchAsync, ApiResponse} from '@utils/index';
import {companyValidation} from '@validations/index';
import {storeUpload} from '../utils/fileStore';

/** Keep the uploaded logo (hosted server, else public/uploads/companies) */
const saveLogo = async (req: Request): Promise<string | undefined> =>
    req.file ? storeUpload(req, req.file, 'companies') : undefined;

/**
 * Run a company change and write one audit row for it: SUCCESS with the
 * before/after values, or FAILURE with the error message. Plain validation
 * errors (400) are not audited; nothing was attempted.
 */
const audited = async <T extends {id: string}>(
    req: Request,
    action: 'company.create' | 'company.update' | 'company.delete',
    targetId: string | undefined,
    run: () => Promise<{before?: T | null; after?: T | null}>,
) => {
    const base = {...auditService.fromRequest(req), action, module: 'companies'};
    try {
        const result = await run();
        const id = targetId ?? result.after?.id ?? result.before?.id;
        await auditService.log({...base, targetId: id, companyId: id, ...result});
        return result;
    } catch (error) {
        if (!(error instanceof ZodError)) {
            await auditService.log({
                ...base,
                targetId,
                companyId: targetId,
                result: AuditResult.FAILURE,
                reason: (error as Error).message,
            });
        }
        throw error;
    }
};

const createCompany = catchAsync(async (req, res) => {
    const data = companyValidation.createCompanySchema.parse(req.body);
    const {after: company} = await audited(req, 'company.create', undefined, async () => {
        const logo = await saveLogo(req);
        return {after: await companyService.createCompany(data, logo)};
    });

    return res
        .status(httpStatus.CREATED)
        .json(new ApiResponse(httpStatus.CREATED, company, 'Company created successfully'));
});

const listCompanies = catchAsync(async (req, res) => {
    const query = companyValidation.listCompaniesSchema.parse(req.query);
    const result = await companyService.listCompanies(query);

    return res
        .status(httpStatus.OK)
        .json(new ApiResponse(httpStatus.OK, result, 'Companies fetched successfully'));
});

const getCompany = catchAsync(async (req, res) => {
    const {id} = companyValidation.companyIdSchema.parse(req.params);
    const company = await companyService.getCompanyById(id);

    return res
        .status(httpStatus.OK)
        .json(new ApiResponse(httpStatus.OK, company, 'Company fetched successfully'));
});

const updateCompany = catchAsync(async (req, res) => {
    const {id} = companyValidation.companyIdSchema.parse(req.params);
    const data = companyValidation.updateCompanySchema.parse(req.body);
    const {after: company} = await audited(req, 'company.update', id, async () => {
        const before = await companyService.getCompanyById(id);
        const logo = await saveLogo(req);
        return {before, after: await companyService.updateCompany(id, data, logo)};
    });

    return res
        .status(httpStatus.OK)
        .json(new ApiResponse(httpStatus.OK, company, 'Company updated successfully'));
});

const deleteCompany = catchAsync(async (req, res) => {
    const {id} = companyValidation.companyIdSchema.parse(req.params);
    await audited(req, 'company.delete', id, async () => ({
        before: await companyService.deleteCompany(id),
    }));

    return res
        .status(httpStatus.OK)
        .json(new ApiResponse(httpStatus.OK, {}, 'Company deleted successfully'));
});

export default {
    createCompany,
    listCompanies,
    getCompany,
    updateCompany,
    deleteCompany,
};
