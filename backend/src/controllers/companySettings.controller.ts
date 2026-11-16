import httpStatus from 'http-status';
import {auditService, companySettingsService, storeSettingsService} from '@services/index';
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

/** Store-wide settings (P4-08b): public read for the store, super admin write */
const getStore = catchAsync(async (_req, res) => {
    res.status(httpStatus.OK).json(
        new ApiResponse(httpStatus.OK, await storeSettingsService.get(), 'Store settings'),
    );
});

const updateStore = catchAsync(async (req, res) => {
    const data = companySettingsValidation.storeRulesSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'store.settings.update', module: 'settings', targetId: 'store'},
        () => storeSettingsService.update(data),
    );
    res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, after, 'Store settings saved'));
});

export default {get, update, getStore, updateStore};
