const ngrok = require('ngrok');
const { exec } = require('child_process');
const fs = require('fs');

// Configuration
const config = {
    port: 5000,
    // Replace this with your authtoken from ngrok dashboard
    authtoken: 'YOUR_NGROK_AUTHTOKEN',
    subdomain: 'employee-checklist', // This will give you a consistent URL
    region: 'us'
};

// Function to write URL to a file
function writeUrlToFile(url) {
    const content = `
=== Employee Checklist Application ===

Access URLs:
-----------
Public URL: ${url}
Local URL: http://localhost:${config.port}

Login Credentials:
----------------
Username: admin
Password: admin123

Note: This URL will remain constant as long as the server is running.
Share this URL with anyone who needs to access the application.
    `;
    
    fs.writeFileSync('server-info.txt', content);
    console.log('\nServer information has been saved to server-info.txt');
}

// Start PM2 and Ngrok
async function startServer() {
    try {
        // Start PM2 server
        exec('pm2 restart employee-checklist', async (error, stdout, stderr) => {
            if (error) {
                console.error('Error starting PM2:', error);
                return;
            }
            
            console.log('PM2 server started successfully');
            
            try {
                // Configure ngrok
                await ngrok.authtoken(config.authtoken);
                
                // Start ngrok with custom subdomain
                const url = await ngrok.connect({
                    addr: config.port,
                    subdomain: config.subdomain,
                    region: config.region,
                    authtoken: config.authtoken,
                    onStatusChange: status => {
                        console.log('Ngrok Status:', status);
                    }
                });

                // Create a nice console output
                console.log('\n=== Employee Checklist Application ===');
                console.log('\nYour application is now live!');
                console.log('\nAccess URLs:');
                console.log('-----------');
                console.log('Public URL:', url);
                console.log('Local URL:', `http://localhost:${config.port}`);
                console.log('\nLogin Credentials:');
                console.log('----------------');
                console.log('Username: admin');
                console.log('Password: admin123');
                console.log('\nShare the Public URL with your users!');
                
                // Save URLs to file
                writeUrlToFile(url);
                
            } catch (ngrokError) {
                console.error('Error starting ngrok:', ngrokError);
                console.log('\nPlease make sure you have:');
                console.log('1. Signed up at https://ngrok.com/signup');
                console.log('2. Added your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken');
                console.log('3. Updated the authtoken in this file');
            }
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// Handle cleanup
process.on('SIGINT', async () => {
    try {
        await ngrok.kill();
        exec('pm2 stop employee-checklist', () => {
            console.log('\nServer stopped successfully');
            process.exit(0);
        });
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
});

// Start the server
console.log('\nStarting Employee Checklist Application...');
console.log('Please wait while we set up your secure URL...');
startServer();
