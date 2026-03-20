const { spawn } = require('child_process');
const child = spawn('npx', ['drizzle-kit', 'push'], { stdio: ['pipe', 'inherit', 'inherit'], shell: true });

// We just write newlines to answer "no" or "create table" to any prompts.
const interval = setInterval(() => {
  child.stdin.write('\n');
}, 500);

child.on('close', (code) => {
  clearInterval(interval);
  console.log(`Drizzle push exited with code ${code}`);
  process.exit(code);
});
