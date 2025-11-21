/**
 * Project templates stored as code for version control and consistency.
 * These templates are seeded into the database when running `npm run db:seed`
 */

export interface TemplateMilestoneData {
  name: string
  description?: string
  order: number
}

export interface TemplateData {
  name: string
  description?: string
  isDefault: boolean
  milestones: TemplateMilestoneData[]
}

export const templates: TemplateData[] = [
  {
    name: 'Standard Low Voltage Installation',
    description: 'Default template for low voltage installation projects',
    isDefault: true,
    milestones: [
      {
        name: 'Initial Contact',
        description: 'Initial contact with client',
        order: 0,
      },
      {
        name: 'Quote Sent',
        description: 'Quote has been sent to client',
        order: 1,
      },
      {
        name: 'Quote Approved',
        description: 'Client has approved the quote',
        order: 2,
      },
      {
        name: 'Contract Signed',
        description: 'Contract has been signed',
        order: 3,
      },
      {
        name: 'Payment Received',
        description: 'Initial payment or deposit received',
        order: 4,
      },
      {
        name: 'Parts Ordered',
        description: 'All necessary parts have been ordered',
        order: 5,
      },
      {
        name: 'Parts Received',
        description: 'All parts have been received and verified',
        order: 6,
      },
      {
        name: 'Installation Scheduled',
        description: 'Installation date has been scheduled',
        order: 7,
      },
      {
        name: 'Installation In Progress',
        description: 'Installation work is currently in progress',
        order: 8,
      },
      {
        name: 'Installation Complete',
        description: 'Installation work has been completed',
        order: 9,
      },
      {
        name: 'Final Inspection',
        description: 'Final inspection and quality check',
        order: 10,
      },
      {
        name: 'Project Complete',
        description: 'Project is fully complete and closed',
        order: 11,
      },
    ],
  },
  // Add more templates here as needed
  // Example:
  // {
  //   name: 'Custom Job Template',
  //   description: 'Template for specific job type',
  //   isDefault: false,
  //   milestones: [
  //     { name: 'Milestone 1', description: 'Description', order: 0 },
  //     { name: 'Milestone 2', description: 'Description', order: 1 },
  //   ],
  // },
]

