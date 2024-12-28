const { exec } = require('child_process');
const net = require('net');

function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer()
            .once('error', () => resolve(false))
            .once('listening', () => {
                server.close();
                resolve(true);
            })
            .listen(port);
    });
}

async function killProcessOnPort(port) {
    return new Promise((resolve) => {
        const command = process.platform === 'win32' 
            ? `netstat -ano | findstr :${port}`
            : `lsof -i :${port} -t`;

        exec(command, (error, stdout) => {
            if (error || !stdout) {
                resolve();
                return;
            }

            const pid = process.platform === 'win32'
                ? stdout.split('\n')[0].split(' ').filter(Boolean).pop()
                : stdout.trim();

            const killCommand = process.platform === 'win32'
                ? `taskkill /F /PID ${pid}`
                : `kill -9 ${pid}`;

            exec(killCommand, () => resolve());
        });
    });
}

async function startServer() {
    const port = 5000;
    
    console.log('Checking port availability...');
    const isPortFree = await checkPort(port);
    
    if (!isPortFree) {
        console.log(`Port ${port} is in use. Attempting to free it...`);
        await killProcessOnPort(port);
        console.log('Port freed successfully');
    }

    console.log('Starting server...');
    require('./app.js');
}

startServer();
