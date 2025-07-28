const bcrypt = require('bcryptjs');

const subAdminCredentials = [
  { email: 'subadmin1@ajjak.com', password: '@Sub1!@123!' },
  { email: 'subadmin2@ajjak.com', password: '!@SubAdmin2!123@' },
  { email: 'subadmin3@ajjak.com', password: '@SubbAd3!@123!' },
  { email: 'subadmin4@ajjak.com', password: 'Sub@Admin4@@!!123' },
  { email: 'subadmin5@ajjak.com', password: 'sUbaDmin5@1!!@' }
];

async function hashAllPasswords() {
  console.log('🔐 Generating Sub-Admin Password Hashes');
  console.log('=====================================\n');
  
  let vercelEnvVars = '';
  let localEnvVars = '';
  
  for (const cred of subAdminCredentials) {
    try {
      const hash = await bcrypt.hash(cred.password, 12);
      const envPrefix = cred.email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '_');
      
      console.log(`Email: ${cred.email}`);
      console.log(`Hash: ${hash}\n`);
      
      // For Vercel (production)
      vercelEnvVars += `SUBADMIN_${envPrefix}_EMAIL=${cred.email}\n`;
      vercelEnvVars += `SUBADMIN_${envPrefix}_PASSWORD_HASH=${hash}\n`;
      
      // For local .env (with escaped $)
      const escapedHash = hash.replace(/\$/g, '\\$');
      localEnvVars += `SUBADMIN_${envPrefix}_EMAIL=${cred.email}\n`;
      localEnvVars += `SUBADMIN_${envPrefix}_PASSWORD_HASH=${escapedHash}\n`;
      
    } catch (error) {
      console.error(`Error hashing password for ${cred.email}:`, error);
    }
  }
  
  console.log('\n🚀 FOR VERCEL ENVIRONMENT VARIABLES:');
  console.log('===================================');
  console.log(vercelEnvVars);
  
  console.log('\n🏠 FOR LOCAL .ENV FILE:');
  console.log('=======================');
  console.log(localEnvVars);
  
  console.log('\n📝 ADDITIONAL REQUIRED ENV VARIABLES:');
  console.log('=====================================');
  console.log('JWT_SECRET=6de104ca8e007c4b295d44972332824f9e254ec270e55c540a7f6aa65dbf92e824e24494a580a37a321857b62086b3b80e00769ff50ee159c5633964fd4146ca');
}

// If command line arguments are provided, use old method
if (process.argv.length >= 4) {
  const email = process.argv[2];
  const password = process.argv[3];
  
  async function hashPassword() {
    try {
      const hash = await bcrypt.hash(password, 12);
      console.log(`\nEmail: ${email}`);
      console.log(`Password: ${password}`);
      console.log(`Hash: ${hash}`);
      
      // For Vercel (production)
      console.log(`\nFor Vercel environment variables:`);
      console.log(`SUBADMIN_${email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '_')}_EMAIL=${email}`);
      console.log(`SUBADMIN_${email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '_')}_PASSWORD_HASH=${hash}`);
      
      // For local .env (with escaped $)
      const escapedHash = hash.replace(/\$/g, '\\$');
      console.log(`\nFor local .env file:`);
      console.log(`SUBADMIN_${email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '_')}_EMAIL=${email}`);
      console.log(`SUBADMIN_${email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '_')}_PASSWORD_HASH=${escapedHash}`);
      
    } catch (error) {
      console.error('Error hashing password:', error);
    }
  }
  
  hashPassword();
} else {
  // Hash all sub-admin passwords
  hashAllPasswords();
} 