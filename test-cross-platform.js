/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Cross-Platform Shell Detection Test
 * MIT License
 */

const { ShellDetector, CommandAdapter } = require('./src/utils/shell-detection.js');

console.log('🌍 Cross-Platform Shell Detection Test');
console.log('='.repeat(50));

async function testCrossPlatform() {
    try {
        // Test current environment
        console.log('\n🔍 Current Environment Detection:');
        const shellInfo = await ShellDetector.detectShell();
        console.log(`Platform: ${shellInfo.platform}`);
        console.log(`Shell: ${shellInfo.shell}`);
        console.log(`Shell Type: ${shellInfo.shellType}`);
        console.log(`Supports Unix Commands: ${shellInfo.supportsUnixCommands}`);
        console.log(`Shell Path: ${shellInfo.shellPath}`);

        // Test command adaptation for various scenarios
        console.log('\n🧪 Command Adaptation Tests:');
        
        const testCommands = [
            'ls -la',
            'dir',
            'pwd',
            'cd',
            'clear',
            'cls',
            'cp file1.txt file2.txt',
            'copy file1.txt file2.txt',
            'rm -rf test-dir',
            'rmdir /s /q test-dir',
            'cat README.md',
            'type README.md',
            'grep "pattern" file.txt',
            'findstr "pattern" file.txt',
            'which node',
            'where node',
            'export NODE_ENV=production',
            'set NODE_ENV=production'
        ];

        for (const command of testCommands) {
            const adapted = await CommandAdapter.adaptCommand(command, shellInfo);
            const isSafe = await CommandAdapter.isCommandSafe(adapted, shellInfo);
            const changed = command !== adapted;
            
            console.log(`${changed ? '🔄' : '✅'} ${command.padEnd(25)} -> ${adapted.padEnd(25)} ${isSafe ? '✅' : '⚠️'}`);
        }

        // Test shell syntax
        console.log('\n⚙️ Shell Syntax Test:');
        const syntax = await CommandAdapter.getShellSyntax(shellInfo);
        console.log(`Path Separator: ${syntax.pathSeparator}`);
        console.log(`Command Separator: ${syntax.commandSeparator}`);
        console.log(`Comment Prefix: ${syntax.commentPrefix}`);
        console.log(`Environment Var Prefix: ${syntax.environmentVarPrefix}`);

        // Test dangerous command detection
        console.log('\n🚨 Dangerous Command Detection:');
        const dangerousCommands = [
            'rm -rf /',
            'del /s /q C:\\*.*',
            'format c:',
            'shutdown /s',
            'reboot',
            'normal safe command'
        ];

        for (const cmd of dangerousCommands) {
            const isSafe = await CommandAdapter.isCommandSafe(cmd, shellInfo);
            console.log(`${isSafe ? '✅' : '🚫'} ${cmd.padEnd(30)} - ${isSafe ? 'Safe' : 'Dangerous'}`);
        }

        console.log('\n✅ Cross-platform test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testCrossPlatform();
