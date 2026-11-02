const fs = require('fs');

const files = [
  'backend/src/cli/createSuperAdmin.ts',
  'backend/src/controllers/ecommerce.controller.ts',
  'backend/src/controllers/org.controller.ts',
  'backend/src/services/account.service.ts',
  'backend/src/services/branch.service.ts',
  'backend/src/services/company.service.ts',
  'backend/src/services/permission.service.ts',
  'backend/src/services/user.service.ts'
];

for (const f of files) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content
      .replace(/Role\.SUPERADMIN/g, 'Role.SUPER_ADMIN')
      .replace(/Role\.COMPANY_ADMIN/g, 'Role.ADMIN')
      .replace(/Role\.BRANCH_ADMIN/g, 'Role.SUB_ADMIN')
      .replace(/Role\.CUSTOMER/g, 'Role.USER')
      .replace(/'SUPERADMIN'/g, "'SUPER_ADMIN'")
      .replace(/'COMPANY_ADMIN'/g, "'ADMIN'")
      .replace(/'BRANCH_ADMIN'/g, "'SUB_ADMIN'")
      .replace(/'CUSTOMER'/g, "'USER'");
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated', f);
  }
}

