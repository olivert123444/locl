const { spawn } = require('child_process');
const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');

// Default Expo port
const PORT = 19000;

// Start Expo
console.log('Starting Expo development server...');
const expoProcess = spawn('npx', ['expo', 'start'], {
  stdio: 'inherit',
  shell: true,
});

// Function to create or update .env file with ngrok URL
const updateEnvFile = (url) => {
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  
  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Check if EXPO_PUBLIC_API_URL already exists in the file
  if (envContent.includes('EXPO_PUBLIC_API_URL=')) {
    // Replace the existing URL
    envContent = envContent.replace(
      /EXPO_PUBLIC_API_URL=.*/,
      `EXPO_PUBLIC_API_URL=${url}`
    );
  } else {
    // Add the new URL
    envContent += `\nEXPO_PUBLIC_API_URL=${url}`;
  }

  // Write the updated content back to the .env file
  fs.writeFileSync(envPath, envContent);
  console.log(`Updated .env file with ngrok URL: ${url}`);
};

// Start ngrok after a delay to ensure Expo is running
setTimeout(async () => {
  try {
    console.log('Starting ngrok tunnel...');
    const url = await ngrok.connect({
      addr: PORT,
      region: 'us', // or 'eu', 'au', 'ap', 'sa', 'jp', 'in'
    });
    
    console.log(`Ngrok tunnel established at: ${url}`);
    console.log('Use this URL in your Supabase CORS settings');
    
    // Update .env file with the ngrok URL
    updateEnvFile(url);
    
  } catch (error) {
    console.error('Error starting ngrok:', error);
    process.exit(1);
  }
}, 5000);

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await ngrok.kill();
  expoProcess.kill();
  process.exit(0);
});
