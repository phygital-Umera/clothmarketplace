import httpStatus from 'http-status';
import {auditService, companySettingsService} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import companySettingsValidation from '../validations/companySettings.validation';

/* The company's business rules (P4-08): the owner changes them, every panel reads them */

const companyOf = (companyId?: string | null) => {
    if (!companyId) throw new ApiError(httpStatus.FORBIDDEN, 'No company is linked to this account');
    return companyId;
};

const get = catchAsync(async (req, res) => {
    const data = await companySettingsService.get(companyOf(req.user.companyId));
    res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, data, 'Company settings'));
});

const update = catchAsync(async (req, res) => {
    const companyId = companyOf(req.user.companyId);
    const data = companySettingsValidation.companyRulesSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'company.settings.update', module: 'settings', targetId: companyId},
        () => companySettingsService.update(companyId, data),
    );
    res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, after, 'Settings saved'));
});

export default {get, update};
