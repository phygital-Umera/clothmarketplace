const fs = require('fs');

let content = fs.readFileSync('frontend/src/context/AuthContextProvider.tsx', 'utf8');
content = content.replace("role === 'SUPERADMIN'", "role === 'SUPER_ADMIN'")
                 .replace("role === 'COMPANY_ADMIN'", "role === 'ADMIN'");
fs.writeFileSync('frontend/src/context/AuthContextProvider.tsx', content, 'utf8');
console.log('AuthContextProvider updated successfully');

