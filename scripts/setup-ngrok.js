/**
 * Ngrok Setup Helper Script
 * 
 * This script helps with setting up and using ngrok for Expo development.
 * It provides instructions for first-time setup and usage.
 */

const chalk = require('chalk') || { green: (text) => text, yellow: (text) => text, blue: (text) => text };
const fs = require('fs');
const path = require('path');

console.log(chalk.green('===== Ngrok Setup for Expo Development ====='));
console.log(chalk.yellow('\nFirst Time Setup:'));
console.log('1. Sign up for a free ngrok account at https://ngrok.com/signup');
console.log('2. Get your authtoken from the ngrok dashboard');
console.log('3. Run this command to configure ngrok:');
console.log(chalk.blue('   ngrok config add-authtoken YOUR_AUTH_TOKEN'));

console.log(chalk.yellow('\nUsing ngrok with Expo:'));
console.log('1. Start your Expo development server in one terminal:');
console.log(chalk.blue('   npm run start'));
console.log('2. In a separate terminal, start the ngrok tunnel:');
console.log(chalk.blue('   npm run tunnel'));
console.log('3. Or use the combined command to start both:');
console.log(chalk.blue('   npm run dev-tunnel'));

console.log(chalk.yellow('\nAvailable Scripts:'));
console.log('- npm run tunnel: Creates a tunnel for the Expo server (port 19000)');
console.log('- npm run tunnel-dev: Creates a tunnel for the Expo DevTools (port 19002)');
console.log('- npm run tunnel-both: Creates tunnels for both ports');
console.log('- npm run dev-tunnel: Starts both the Expo server and ngrok tunnel');

console.log(chalk.green('\nTesting on Multiple Devices:'));
console.log('1. When ngrok starts, it will display a forwarding URL (https://xxxx.ngrok.io)');
console.log('2. On the second device, open the Expo Go app');
console.log('3. Tap "Enter URL manually" and enter the ngrok URL');
console.log('4. Or scan the QR code displayed in your terminal');

console.log(chalk.yellow('\nNote: The free tier of ngrok has some limitations:'));
console.log('- Sessions last 2 hours before needing to restart');
console.log('- URLs change each time you restart ngrok');
console.log('- Limited to 4 tunnels simultaneously');

console.log(chalk.green('\nHappy testing!'));
