import {branchStaffService} from '@services/index';
import {catchAsync} from '@utils/index';
import {branchOf, ok} from './scope';

const list = catchAsync(async (req, res) => {
    const str = (k: string) => (typeof req.query[k] === 'string' ? (req.query[k] as string) : undefined);
    const data = await branchStaffService.getStaff(branchOf(req), {
        tab: str('tab'),
        shop: str('shop'),
        search: str('search'),
    });
    return ok(res, data, 'Branch staff fetched successfully');
});

export default {list};
