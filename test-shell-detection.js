/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Shell Detection Test Suite
 * MIT License
 */

const { detectShell, adaptCommand, validateCommand, getCommandPrefix } = require('./src/utils/shell-detection');

async function testShellDetection() {
    console.log('🔍 Testing Shell Detection...\n');
    
    try {
        // Test shell detection
        const shellInfo = await detectShell();
        
        console.log('📋 Detected Shell Information:');
        console.log(`  Platform: ${shellInfo.platform}`);
        console.log(`  Shell: ${shellInfo.shell}`);
        console.log(`  Is Windows: ${shellInfo.isWindows}`);
        console.log(`  Is Linux: ${shellInfo.isLinux}`);
        console.log(`  Is Mac: ${shellInfo.isMac}`);
        console.log(`  Is Git Bash: ${shellInfo.isGitBash}`);
        console.log(`  Is WSL: ${shellInfo.isWSL}`);
        console.log(`  Is MinGW: ${shellInfo.isMingw}`);
        console.log(`  Is Cygwin: ${shellInfo.isCygwin}`);
        console.log(`  Shell Env: ${shellInfo.shellEnv}`);
        console.log(`  Comspec: ${shellInfo.comspec}`);
        
        return shellInfo;
    } catch (error) {
        console.error('❌ Shell detection failed:', error.message);
        return null;
    }
}

async function testCommandAdaptation(shellInfo) {
    console.log('\n🔄 Testing Command Adaptation...\n');
    
    const testCommands = [
        'ls -la',
        'pwd',
        'mkdir test-dir',
        'rm -rf test-dir',
        'cp file1.txt file2.txt',
        'mv old.txt new.txt',
        'cat README.md',
        'grep "pattern" file.txt',
        'which node',
        'export NODE_ENV=production'
    ];
    
    for (const command of testCommands) {
        try {
            const adaptedCommand = adaptCommand(command, shellInfo);
            const isSafe = validateCommand(adaptedCommand, shellInfo);
            
            console.log(`📝 Original:  ${command}`);
            if (adaptedCommand !== command) {
                console.log(`✨ Adapted:   ${adaptedCommand}`);
            } else {
                console.log(`✅ Same:      ${command}`);
            }
            console.log(`🛡️  Safe:      ${isSafe ? 'Yes' : 'No'}`);
            console.log('');
        } catch (error) {
            console.error(`❌ Failed to adapt "${command}":`, error.message);
        }
    }
}

async function testShellSyntax(shellInfo) {
    console.log('⚙️  Testing Shell Syntax...\n');
    
    try {
        const prefix = getCommandPrefix(shellInfo);
        
        console.log('📋 Shell Syntax Information:');
        console.log(`  Command Prefix: "${prefix}"`);
        console.log(`  Platform: ${shellInfo.platform}`);
        console.log(`  Shell: ${shellInfo.shell}`);
        console.log(`  Supports Unix Commands: ${shellInfo.isGitBash || shellInfo.isMingw || shellInfo.isCygwin || shellInfo.isWSL || shellInfo.isLinux || shellInfo.isMac}`);
        
    } catch (error) {
        console.error('❌ Shell syntax detection failed:', error.message);
    }
}

async function runTests() {
    console.log('🚀 Starting Shell Detection Tests\n');
    console.log('=' .repeat(50));
    
    const shellInfo = await testShellDetection();
    
    if (shellInfo) {
        await testCommandAdaptation(shellInfo);
        await testShellSyntax(shellInfo);
        
        console.log('✅ All tests completed successfully!');
    } else {
        console.log('❌ Tests failed due to shell detection error');
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🏁 Test suite finished');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testShellDetection,
    testCommandAdaptation,
    testShellSyntax,
    runTests
};
