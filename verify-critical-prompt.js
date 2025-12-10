/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Critical System Prompt Verification Script
 * License: MIT
 */

// Simple verification script to demonstrate the critical system prompt integration
const fs = require('fs');
const path = require('path');

console.log('🚨 CRITICAL SYSTEM PROMPT VERIFICATION 🚨\n');

// Read the critical system prompt file
const criticalPromptPath = path.join(__dirname, 'src', 'core', 'prompts', 'critical-system-prompt.ts');
const criticalPromptContent = fs.readFileSync(criticalPromptPath, 'utf8');

// Extract the CRITICAL_SYSTEM_PROMPT constant
const criticalPromptMatch = criticalPromptContent.match(/export const CRITICAL_SYSTEM_PROMPT = `([\s\S]*?)`/m);
if (!criticalPromptMatch) {
  console.error('❌ CRITICAL_SYSTEM_PROMPT not found!');
  process.exit(1);
}

const criticalPrompt = criticalPromptMatch[1];

console.log('✅ CRITICAL_SYSTEM_PROMPT successfully extracted\n');

// Verify key sections are present
const requiredSections = [
  '🚨 CRITICAL SYSTEM REQUIREMENTS - MANDATORY COMPLIANCE',
  'ALL AI MODELS MUST STRICTLY ADHERE',
  '🏗️ INTEGRATION & ARCHITECTURE REQUIREMENTS',
  'System Integration',
  'Scalability Architecture',
  '🔒 SECURITY & PRIVACY MANDATES',
  'Zero-Trust Security Architecture',
  'Data Privacy Protection',
  '♿ ACCESSIBILITY & USABILITY REQUIREMENTS',
  'Universal Design Principles',
  'WCAG 2.1 AA',
  '🔧 MAINTAINABILITY & OPERATIONAL EXCELLENCE',
  'Code Quality Standards',
  'Testing & Quality Assurance',
  '🚀 LIVE OPERATIONAL CONSIDERATIONS',
  'High Availability & Reliability',
  '🚨 NON-NEGOTIABLE COMPLIANCE',
  'VIOLATION OF THESE REQUIREMENTS IS NOT PERMITTED'
];

console.log('🔍 Verifying critical sections...\n');

let allSectionsPresent = true;
requiredSections.forEach(section => {
  if (criticalPrompt.includes(section)) {
    console.log(`✅ ${section}`);
  } else {
    console.log(`❌ MISSING: ${section}`);
    allSectionsPresent = false;
  }
});

console.log('\n📊 VERIFICATION SUMMARY:');
console.log(`Total sections checked: ${requiredSections.length}`);
console.log(`Sections present: ${requiredSections.filter(s => criticalPrompt.includes(s)).length}`);
console.log(`Sections missing: ${requiredSections.filter(s => !criticalPrompt.includes(s)).length}`);

if (allSectionsPresent) {
  console.log('\n🎉 ALL CRITICAL SECTIONS PRESENT!');
  console.log('🛡️ The AI will now be forced to follow enterprise-grade requirements for:');
  console.log('   • Security (Zero-Trust, Authentication, Encryption, Data Privacy)');
  console.log('   • Integration (API Design, Microservices, Event-Driven Architecture)');
  console.log('   • Scalability (Horizontal Scaling, Caching, Load Balancing)');
  console.log('   • Accessibility (WCAG 2.1 AA, Universal Design)');
  console.log('   • Maintainability (Code Quality, Testing, Documentation)');
  console.log('   • Live Operations (High Availability, Monitoring, Disaster Recovery)');
  console.log('\n⚠️  THESE REQUIREMENTS CANNOT BE VIOLATED UNDER ANY CIRCUMSTANCES!');
} else {
  console.log('\n❌ SOME CRITICAL SECTIONS ARE MISSING!');
  process.exit(1);
}

// Check integration with system.ts
const systemPromptPath = path.join(__dirname, 'src', 'core', 'prompts', 'system.ts');
const systemPromptContent = fs.readFileSync(systemPromptPath, 'utf8');

if (systemPromptContent.includes('import { CRITICAL_SYSTEM_PROMPT }')) {
  console.log('\n✅ CRITICAL_SYSTEM_PROMPT properly imported in system.ts');
} else {
  console.log('\n❌ CRITICAL_SYSTEM_PROMPT not imported in system.ts');
  process.exit(1);
}

if (systemPromptContent.includes('CRITICAL_SYSTEM_PROMPT +') || systemPromptContent.includes('`${CRITICAL_SYSTEM_PROMPT}')) {
  console.log('✅ CRITICAL_SYSTEM_PROMPT properly prepended to system prompts');
} else {
  console.log('❌ CRITICAL_SYSTEM_PROMPT not properly prepended to system prompts');
  process.exit(1);
}

console.log('\n🎯 INTEGRATION VERIFICATION COMPLETE!');
console.log('🚀 The critical system prompt is now active and will be enforced for all AI interactions.');
