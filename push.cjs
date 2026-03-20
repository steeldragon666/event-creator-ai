const { spawn } = require('child_process');
const child = spawn('npx', ['drizzle-kit', 'push'], { stdio: ['pipe', 'inherit', 'inherit'], shell: true });

const interval = setInterval(() => {
  child.stdin.write('\n');
}, 500);

child.on('close', (code) => {
  clearInterval(interval);
  console.log(`Drizzle push exited with code ${code}`);
  process.exit(code);
});
