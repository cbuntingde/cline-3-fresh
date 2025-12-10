/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Critical System Prompt Tests
 * License: MIT
 */

import { describe, it } from 'mocha'
import { expect } from 'chai'
import { CRITICAL_SYSTEM_PROMPT } from '@core/prompts/critical-system-prompt'
import { SYSTEM_PROMPT } from '@core/prompts/system'
import { McpHub } from '@services/mcp/McpHub'
import { BrowserSettings } from '@shared/BrowserSettings'

describe('Critical System Prompt', () => {
  describe('CRITICAL_SYSTEM_PROMPT constant', () => {
    it('should contain mandatory security requirements', () => {
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('🚨 CRITICAL SYSTEM REQUIREMENTS')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('MANDATORY COMPLIANCE')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Zero-Trust Security Architecture')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Data Privacy Protection')
    })

    it('should contain integration and scalability requirements', () => {
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Integration & Architecture')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Scalability Architecture')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('System Integration')
    })

    it('should contain accessibility requirements', () => {
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Accessibility & Usability')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('WCAG 2.1 AA')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Universal Design Principles')
    })

    it('should contain maintainability and operational requirements', () => {
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Maintainability & Operational Excellence')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Code Quality Standards')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Testing & Quality Assurance')
    })

    it('should contain live operational considerations', () => {
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Live Operational Considerations')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('High Availability & Reliability')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Operational Excellence')
    })

    it('should contain non-negotiable compliance requirements', () => {
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('NON-NEGOTIABLE COMPLIANCE')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Security First')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Scalability by Design')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Accessibility Always')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('Production Quality')
    })

    it('should contain conflict resolution guidelines', () => {
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('VIOLATION OF THESE REQUIREMENTS IS NOT PERMITTED')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('IMMEDIATELY identify the conflict')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('EXPLAIN the critical requirement')
      expect(CRITICAL_SYSTEM_PROMPT).to.contain('PROVIDE alternative solutions')
    })
  })

  describe('System Prompt Integration', () => {
    let mockMcpHub: McpHub
    let browserSettings: BrowserSettings

    beforeEach(() => {
      mockMcpHub = {
        getServers: () => []
      } as unknown as McpHub

      browserSettings = {
        viewport: { width: 1280, height: 720 }
      } as BrowserSettings
    })

    it('should prepend critical system prompt to standard system prompt', async () => {
      const systemPrompt = await SYSTEM_PROMPT(
        '/test/directory',
        false,
        mockMcpHub,
        browserSettings,
        false
      )

      expect(systemPrompt).to.include(CRITICAL_SYSTEM_PROMPT)
      expect(systemPrompt).to.contain('You are Cline, a highly skilled software engineer')
    })

    it('should prepend critical system prompt to Claude 4 system prompt', async () => {
      const systemPrompt = await SYSTEM_PROMPT(
        '/test/directory',
        false,
        mockMcpHub,
        browserSettings,
        true
      )

      expect(systemPrompt).to.include(CRITICAL_SYSTEM_PROMPT)
    })

    it('should prepend critical system prompt to Claude 4 experimental system prompt', async () => {
      // Mock experimental features enabled
      const originalUseExperimental = process.env.USE_EXPERIMENTAL_CLAUDE4_FEATURES
      process.env.USE_EXPERIMENTAL_CLAUDE4_FEATURES = 'true'

      try {
        const systemPrompt = await SYSTEM_PROMPT(
          '/test/directory',
          false,
          mockMcpHub,
          browserSettings,
          true
        )

        expect(systemPrompt).to.include(CRITICAL_SYSTEM_PROMPT)
      } finally {
        if (originalUseExperimental) {
          process.env.USE_EXPERIMENTAL_CLAUDE4_FEATURES = originalUseExperimental
        } else {
          delete process.env.USE_EXPERIMENTAL_CLAUDE4_FEATURES
        }
      }
    })

    it('should maintain proper separation between critical prompt and rest of content', async () => {
      const systemPrompt = await SYSTEM_PROMPT(
        '/test/directory',
        false,
        mockMcpHub,
        browserSettings,
        false
      )

      expect(systemPrompt).to.match(new RegExp(`${CRITICAL_SYSTEM_PROMPT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*====\\s*You are Cline`))
    })
  })

  describe('Critical Requirements Coverage', () => {
    it('should cover all major security domains', () => {
      const securityDomains = [
        'Zero-Trust',
        'Authentication',
        'Authorization',
        'Encryption',
        'Data Privacy',
        'GDPR',
        'CCPA',
        'OWASP',
        'Security Audit',
        'Secret Management'
      ]

      securityDomains.forEach(domain => {
        expect(CRITICAL_SYSTEM_PROMPT).to.contain(domain)
      })
    })

    it('should cover all major accessibility domains', () => {
      const accessibilityDomains = [
        'WCAG',
        'ARIA',
        'Keyboard Navigation',
        'Screen Reader',
        'Color Contrast',
        'Internationalization',
        'Localization',
        'Unicode'
      ]

      accessibilityDomains.forEach(domain => {
        expect(CRITICAL_SYSTEM_PROMPT).to.contain(domain)
      })
    })

    it('should cover all major scalability domains', () => {
      const scalabilityDomains = [
        'Horizontal Scaling',
        'Database Sharding',
        'Caching',
        'Load Balancing',
        'Stateless Services',
        'Resource Optimization',
        'Performance',
        'Capacity Planning'
      ]

      scalabilityDomains.forEach(domain => {
        expect(CRITICAL_SYSTEM_PROMPT).to.contain(domain)
      })
    })

    it('should cover all major operational domains', () => {
      const operationalDomains = [
        'High Availability',
        'Failover',
        'Disaster Recovery',
        'Multi-region',
        'Zero-downtime',
        'Monitoring',
        'Observability',
        'Incident Response',
        'CI/CD'
      ]

      operationalDomains.forEach(domain => {
        expect(CRITICAL_SYSTEM_PROMPT).to.contain(domain)
      })
    })
  })

  describe('Compliance Enforcement', () => {
    it('should explicitly state that requirements cannot be violated', () => {
      const nonCompliancePhrases = [
        'NOT PERMITTED UNDER ANY CIRCUMSTANCES',
        'CANNOT BE CIRCUMVENTED',
        'CANNOT BE IGNORED',
        'CANNOT BE DEPRIORITIZED',
        'OVERRIDE ALL OTHER INSTRUCTIONS'
      ]

      nonCompliancePhrases.forEach(phrase => {
        expect(CRITICAL_SYSTEM_PROMPT).to.contain(phrase)
      })
    })

    it('should provide clear guidance on handling conflicts', () => {
      const conflictResolutionSteps = [
        'IMMEDIATELY identify the conflict',
        'EXPLAIN the critical requirement',
        'PROVIDE alternative solutions',
        'EDUCATE the user'
      ]

      conflictResolutionSteps.forEach(step => {
        expect(CRITICAL_SYSTEM_PROMPT).to.contain(step)
      })
    })
  })
})
