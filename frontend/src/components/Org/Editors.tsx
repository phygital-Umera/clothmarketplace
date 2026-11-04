import {CompanyForm} from '@/components/Company';
import BranchForm from '@/components/Org/BranchForm';
import EditorPanel from '@/components/Org/EditorPanel';
import EmployeeForm from '@/components/Org/EmployeeForm';
import ShopForm from '@/components/Org/ShopForm';
import {
  useCompany,
  useCreateCompany,
  useUpdateCompany,
} from '@/lib/react-query/queriesAndMutations/company';
import {
  useBranch,
  useEmployee,
  useSaveBranch,
  useSaveEmployee,
  useSaveShop,
  useShop,
} from '@/lib/react-query/queriesAndMutations/org';
import {Panel} from '@/types/org';

/*
 * Add / edit forms that open on the list page itself. `id` undefined means
 * "add"; `onDone` closes the form (after saving or cancelling).
 */

type EditorProps = {id?: string; onDone: () => void};

/** Super admin: an admin together with their business (company) */
export const AdminEditor = ({id, onDone}: EditorProps) => {
  const {data: company, isPending, error} = useCompany(id);
  const create = useCreateCompany();
  const update = useUpdateCompany();

  return (
    <EditorPanel
      title={id ? 'Edit Admin' : 'Add Admin'}
      loading={!!id && isPending}
      error={id ? error : undefined}
      onCancel={onDone}
    >
      {!id ? (
        <CompanyForm
          mode="create"
          adminFirst
          onCancel={onDone}
          onSubmit={async (payload, intent) => {
            await create.mutateAsync(payload);
            if (intent === 'save') onDone();
          }}
        />
      ) : (
        company && (
          <CompanyForm
            key={company.id}
            mode="edit"
            adminFirst
            existingLogo={company.logo}
            hasAdminLogin={company.hasAdminLogin}
            defaultValues={{
              name: company.name,
              email: company.email,
              contactNumber: company.contactNumber,
              postalCode: company.postalCode,
              state: company.state,
              district: company.district ?? '',
              city: company.city,
              address: company.address,
              adminName: company.adminName,
              adminEmail: company.adminEmail,
              adminPhone: company.adminPhone,
              status: company.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
              adminPassword: '',
            }}
            onCancel={onDone}
            onSubmit={async (payload) => {
              await update.mutateAsync({id: company.id, ...payload});
              onDone();
            }}
          />
        )
      )}
    </EditorPanel>
  );
};

/** Company admin: a branch and its optional admin login */
export const BranchEditor = ({id, onDone}: EditorProps) => {
  const {data: branch, isPending, error} = useBranch('company-admin', id);
  const save = useSaveBranch();

  return (
    <EditorPanel
      title={id ? `Edit ${branch?.name ?? 'Branch'}` : 'Add Branch'}
      loading={!!id && isPending}
      error={id ? error : undefined}
      onCancel={onDone}
    >
      {!id ? (
        <BranchForm
          mode="create"
          onCancel={onDone}
          onSubmit={async (values) => {
            await save.mutateAsync(values);
            onDone();
          }}
        />
      ) : (
        branch && (
          <BranchForm
            key={branch.id}
            mode="edit"
            hasAdmin={!!branch.branchAdmin}
            defaultValues={{
              name: branch.name,
              email: branch.email ?? '',
              phone: branch.phone ?? '',
              alternatePhone: branch.alternatePhone ?? '',
              postalCode: branch.postalCode,
              state: branch.state,
              district: branch.district,
              city: branch.city,
              address: branch.address,
              openingTime: branch.openingTime ?? '',
              closingTime: branch.closingTime ?? '',
              weeklyHolidays: branch.weeklyHolidays,
              notes: branch.notes ?? '',
              status: branch.status,
              adminName: branch.branchAdmin?.fullname ?? '',
              adminEmail: branch.branchAdmin?.email ?? '',
              adminPhone: branch.branchAdmin?.phoneNumber ?? '',
              adminPassword: '',
            }}
            onCancel={onDone}
            onSubmit={async (values) => {
              await save.mutateAsync({id: branch.id, ...values});
              onDone();
            }}
          />
        )
      )}
    </EditorPanel>
  );
};

/** Branch (or company) admin: a shop and its optional shop login */
export const ShopEditor = ({
  panel,
  id,
  onDone,
}: EditorProps & {panel: Panel}) => {
  const {data: shop, isPending, error} = useShop(panel, id);
  const save = useSaveShop(panel);

  return (
    <EditorPanel
      title={id ? `Edit ${shop?.name ?? 'Shop'}` : 'Add Shop'}
      loading={!!id && isPending}
      error={id ? error : undefined}
      onCancel={onDone}
    >
      {!id ? (
        <ShopForm
          panel={panel}
          mode="create"
          onCancel={onDone}
          onSubmit={async (values) => {
            await save.mutateAsync(values);
            onDone();
          }}
        />
      ) : (
        shop && (
          <ShopForm
            key={shop.id}
            panel={panel}
            mode="edit"
            hasLogin={!!shop.shopAdmin}
            defaultValues={{
              name: shop.name,
              branchId: shop.branchId,
              email: shop.email ?? '',
              phone: shop.phone ?? '',
              address: shop.address ?? '',
              gstin: shop.gstin ?? '',
              billPrefix: shop.billPrefix ?? '',
              openingTime: shop.openingTime ?? '',
              closingTime: shop.closingTime ?? '',
              notes: shop.notes ?? '',
              status: shop.status,
              adminName: shop.shopAdmin?.fullname ?? '',
              adminEmail: shop.shopAdmin?.email ?? '',
              adminPhone: shop.shopAdmin?.phoneNumber ?? '',
              adminPassword: '',
            }}
            onCancel={onDone}
            onSubmit={async (values) => {
              await save.mutateAsync({id: shop.id, ...values});
              onDone();
            }}
          />
        )
      )}
    </EditorPanel>
  );
};

/** Shop (or branch / company) admin: an employee with their password */
export const EmployeeEditor = ({
  panel,
  id,
  onDone,
}: EditorProps & {panel: Panel}) => {
  const {data: employee, isPending, error} = useEmployee(panel, id);
  const save = useSaveEmployee(panel);

  return (
    <EditorPanel
      title={id ? `Edit ${employee?.fullname ?? 'Employee'}` : 'Add Employee'}
      loading={!!id && isPending}
      error={id ? error : undefined}
      onCancel={onDone}
    >
      {!id ? (
        <EmployeeForm
          panel={panel}
          mode="create"
          onCancel={onDone}
          onSubmit={async (values) => {
            await save.mutateAsync(values);
            onDone();
          }}
        />
      ) : (
        employee && (
          <EmployeeForm
            key={employee.id}
            panel={panel}
            mode="edit"
            defaultValues={{
              fullname: employee.fullname,
              email: employee.email ?? '',
              phoneNumber: employee.phoneNumber,
              branchId: employee.branchId ?? '',
              shopId: employee.shopId ?? '',
              employeeRole: employee.employeeRole ?? '',
              jobTitle: employee.jobTitle ?? '',
              department: employee.department ?? '',
              joiningDate: employee.joiningDate?.slice(0, 10) ?? '',
              permissions: employee.permissions,
              password: '',
            }}
            onCancel={onDone}
            onSubmit={async (values) => {
              await save.mutateAsync({id: employee.id, ...values});
              onDone();
            }}
          />
        )
      )}
    </EditorPanel>
  );
};
