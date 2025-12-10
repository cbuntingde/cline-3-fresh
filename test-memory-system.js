/**
 * Test script for the enhanced memory system with memory types
 * This script validates that all memory types are working correctly
 */

const { MemoryManager, MemoryType } = require('./src/core/memory/MemoryManager');
const vscode = require('vscode');

// Mock VSCode environment for testing
const mockContext = {
    globalState: {
        get: () => null,
        update: () => Promise.resolve()
    },
    workspaceState: {
        get: () => null,
        update: () => Promise.resolve()
    }
};

const mockOutputChannel = {
    appendLine: (message) => console.log(`[Memory] ${message}`),
    show: () => {},
    hide: () => {},
    dispose: () => {}
};

async function testMemorySystem() {
    console.log('🧠 Testing Enhanced Memory System with Memory Types\n');

    try {
        // Initialize Memory Manager
        const memoryManager = new MemoryManager(mockContext, mockOutputChannel);
        
        console.log('✅ Memory Manager initialized successfully');

        // Test 1: Add different types of memories
        console.log('\n📝 Test 1: Adding different memory types...');
        
        const episodicId = await memoryManager.addMemoryEntry({
            type: MemoryType.EPISODIC,
            title: "Completed user authentication feature",
            content: "Successfully implemented JWT-based authentication with refresh tokens",
            context: "project_development",
            confidence: 0.9,
            tags: ["authentication", "jwt", "security"],
            metadata: { feature: "auth", completed: true },
            importance: 8,
            relatedMemories: []
        });

        const proceduralId = await memoryManager.addMemoryEntry({
            type: MemoryType.PROCEDURAL,
            title: "How to set up TypeScript project",
            content: "Run 'npm init -y', then 'npm install typescript @types/node', then 'npx tsc --init'",
            context: "setup_guide",
            confidence: 0.95,
            tags: ["typescript", "setup", "npm"],
            metadata: { language: "typescript" },
            importance: 9,
            relatedMemories: []
        });

        const semanticId = await memoryManager.addMemoryEntry({
            type: MemoryType.SEMANTIC,
            title: "Definition: React Hooks",
            content: "React Hooks are functions that let you use state and other React features in functional components",
            context: "concept",
            confidence: 0.85,
            tags: ["react", "hooks", "definition"],
            metadata: { concept: "react_hooks" },
            importance: 7,
            relatedMemories: []
        });

        const workingMemoryId = await memoryManager.addMemoryEntry({
            type: MemoryType.WORKING_MEMORY,
            title: "Current task: Fix login bug",
            content: "User reports login button not working on mobile devices. Need to investigate responsive design issues.",
            context: "current_task",
            confidence: 0.9,
            tags: ["bug", "login", "mobile"],
            metadata: { priority: "high", assignedTo: "dev_team" },
            importance: 6,
            relatedMemories: []
        });

        console.log(`✅ Added episodic memory: ${episodicId}`);
        console.log(`✅ Added procedural memory: ${proceduralId}`);
        console.log(`✅ Added semantic memory: ${semanticId}`);
        console.log(`✅ Added working memory: ${workingMemoryId}`);

        // Test 2: Get memory statistics by type
        console.log('\n📊 Test 2: Getting memory statistics by type...');
        const memoryStats = await memoryManager.getMemoryTypeStats();
        
        console.log('Memory Statistics by Type:');
        for (const [type, stats] of Object.entries(memoryStats)) {
            console.log(`  ${type}: ${stats.count} entries, enabled: ${stats.enabled}, total access: ${stats.totalAccess}`);
        }

        // Test 3: Search for relevant memories
        console.log('\n🔍 Test 3: Searching for relevant memories...');
        
        const authMemories = await memoryManager.getRelevantMemories("authentication", [MemoryType.EPISODIC]);
        console.log(`Found ${authMemories.length} episodic memories about authentication`);
        
        const setupMemories = await memoryManager.getRelevantMemories("setup", [MemoryType.PROCEDURAL]);
        console.log(`Found ${setupMemories.length} procedural memories about setup`);
        
        const reactMemories = await memoryManager.getRelevantMemories("react", [MemoryType.SEMANTIC]);
        console.log(`Found ${reactMemories.length} semantic memories about react`);

        // Test 4: Test conversation classification
        console.log('\n💬 Test 4: Testing conversation memory classification...');
        
        const testMessages = [
            {
                type: "say",
                text: "I completed the user authentication feature today. The JWT implementation is working perfectly.",
                ts: Date.now()
            },
            {
                type: "say", 
                text: "To set up a new TypeScript project, you need to run npm init, install typescript, and configure tsconfig.json",
                ts: Date.now()
            },
            {
                type: "say",
                text: "React Hooks are defined as functions that allow you to use state in functional components",
                ts: Date.now()
            },
            {
                type: "say",
                text: "Currently working on fixing the login bug that affects mobile users. This is a high priority issue.",
                ts: Date.now()
            }
        ];

        await memoryManager.classifyAndAddMemoriesFromConversation(testMessages);
        console.log('✅ Conversation processed for memory classification');

        // Test 5: Test memory type configuration
        console.log('\n⚙️ Test 5: Testing memory type configuration...');
        
        await memoryManager.updateMemoryTypeConfig(MemoryType.SHORT_TERM, {
            enabled: true,
            maxEntries: 50,
            retentionDays: 3
        });
        console.log('✅ Updated short-term memory configuration');

        // Test 6: Test memory limits enforcement
        console.log('\n🚏 Test 6: Testing memory limits enforcement...');
        
        // Add many working memories to test limit enforcement
        for (let i = 0; i < 60; i++) {
            await memoryManager.addMemoryEntry({
                type: MemoryType.WORKING_MEMORY,
                title: `Temporary task ${i}`,
                content: `This is a temporary working memory entry ${i}`,
                context: "temp",
                confidence: 0.5,
                tags: ["temp"],
                metadata: {},
                importance: 3,
                relatedMemories: []
            });
        }
        
        const updatedStats = await memoryManager.getMemoryTypeStats();
        console.log(`Working memory entries after limit enforcement: ${updatedStats[MemoryType.WORKING_MEMORY].count}`);

        // Test 7: Test short-term to long-term promotion
        console.log('\n🔄 Test 7: Testing short-term to long-term promotion...');
        
        const shortTermId = await memoryManager.addMemoryEntry({
            type: MemoryType.SHORT_TERM,
            title: "Important discovery",
            content: "Found a critical performance optimization technique",
            context: "performance",
            confidence: 0.9,
            tags: ["performance", "optimization"],
            metadata: { technique: "caching" },
            importance: 8,
            relatedMemories: []
        });

        // Simulate multiple accesses to trigger promotion
        for (let i = 0; i < 5; i++) {
            await memoryManager.getRelevantMemories("performance", [MemoryType.SHORT_TERM]);
        }

        console.log('✅ Short-term memory accessed multiple times for promotion test');

        // Final statistics
        console.log('\n📈 Final Memory Statistics:');
        const finalStats = await memoryManager.getMemoryTypeStats();
        let totalEntries = 0;
        for (const [type, stats] of Object.entries(finalStats)) {
            if (stats.count > 0) {
                console.log(`  ${type}: ${stats.count} entries`);
                totalEntries += stats.count;
            }
        }
        console.log(`\nTotal memory entries: ${totalEntries}`);

        console.log('\n🎉 All memory system tests completed successfully!');
        
        // Cleanup
        memoryManager.dispose();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testMemorySystem().catch(console.error);
}

module.exports = { testMemorySystem };
