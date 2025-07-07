const bcrypt = require('bcryptjs');
const crypto = require('crypto');

console.log('🔐 FASHO Admin Password Hasher');
console.log('================================');
console.log('This script will generate a secure bcrypt hash of your admin password.\n');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node scripts/hash-password.js <email> <password>');
  console.log('Example: node scripts/hash-password.js admin@fasho.pro mySecurePassword123');
  console.log('\n🔒 Security Note: This is for development only. In production, use a more secure method.');
  process.exit(1);
}

const email = args[0];
const password = args[1];

if (!email || !password) {
  console.log('❌ Both email and password are required.');
  process.exit(1);
}

if (password.length < 8) {
  console.log('❌ Password must be at least 8 characters long.');
  process.exit(1);
}

console.log('🔄 Generating secure hash...');

// Generate hash with salt rounds of 12 (industry standard)
const saltRounds = 12;
const hash = bcrypt.hashSync(password, saltRounds);

// Generate JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('\n✅ Hash generated successfully!');
console.log('\n📝 Add these lines to your .env.local file:');
console.log('=' .repeat(60));
console.log(`ADMIN_EMAIL=${email}`);
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('=' .repeat(60));
console.log('\n🔒 Security Notes:');
console.log('- Never share these values');
console.log('- Never commit .env.local to git');
console.log('- The hash is secure even if exposed');
console.log('- JWT_SECRET should be unique and random');
console.log('- Delete this command from your shell history');

console.log('\n🧹 Clear shell history with:');
console.log('history -d $(history 1 | awk \'{print $1}\')'); 