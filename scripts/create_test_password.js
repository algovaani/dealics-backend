import bcrypt from 'bcrypt';

async function createHashedPassword() {
  try {
    // Original password
    const password = 'Tester@123';
    
    // Hash password using same method as in registration (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('='.repeat(50));
    console.log('🔐 PASSWORD HASH GENERATION');
    console.log('='.repeat(50));
    console.log('Original Password:', password);
    console.log('Hashed Password :', hashedPassword);
    console.log('Hash Length     :', hashedPassword.length, 'characters');
    console.log('='.repeat(50));
    
    // Generate SQL query to insert this password directly into database
    console.log('📝 SQL QUERY TO INSERT IN DATABASE:');
    console.log('```sql');
    console.log('UPDATE users SET password = "' + hashedPassword + '" WHERE username = "your_username";');
    console.log('```');
    
    console.log('📝 SQL QUERY TO INSERT NEW USER:');
    console.log('```sql');
    console.log('INSERT INTO users (username, email, password, first_name, last_name, phone_number, is_email_verified, email_verified_at, user_status, created_at, updated_at) VALUES');
    console.log('("testuser", "test@example.com", "' + hashedPassword + '", "Test", "User", "1234567890", "1", NOW(), "1", NOW(), NOW());');
    console.log('```');
    
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    return null;
  }
}

// Run the function
createHashedPassword();
