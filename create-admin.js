// Create default admin user
import { addUser } from './src/utils/storage.js';

const adminUser = {
  name: 'Administrator',
  username: 'admin',
  password: '123',
  role: 'Admin'
};

try {
  const result = addUser(adminUser);
  console.log('✅ Admin user created successfully!');
  console.log('Username: admin');
  console.log('Password: 123');
  console.log('User ID:', result.id);
} catch (error) {
  console.error('❌ Error creating admin user:', error.message);
}
