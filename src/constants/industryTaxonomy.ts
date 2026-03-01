/**
 * Canonical Industry Taxonomy — single source for Join, Profile Edit, Directory, Feed Search.
 * Primary is selected first; Secondary must be from the allowed list under the chosen Primary.
 * Secondary cannot duplicate Primary. Changing Primary clears Secondary if invalid.
 */

export const INDUSTRY_PRIMARY_OPTIONS = [
  'Technology and Software',
  'Business and Professional Services',
  'Finance and Insurance',
  'Healthcare and Life Sciences',
  'Education and Training',
  'Government and Public Sector',
  'Nonprofit and Social Impact',
  'Manufacturing and Industrial',
  'Retail, E-commerce, and Consumer',
  'Media, Entertainment, and Creative',
  'Real Estate and Construction',
  'Transportation and Travel',
  'Energy and Utilities',
  'Agriculture and Food',
  'Science and Research',
  'Arts, Wellness, and Personal Services',
  'Legal and Compliance',
  'Other',
] as const;

export type PrimaryIndustry = (typeof INDUSTRY_PRIMARY_OPTIONS)[number];

/** Allowed secondary options per primary. Empty = no secondary list for that primary. */
export const INDUSTRY_SECONDARY_BY_PRIMARY: Record<
  PrimaryIndustry,
  readonly string[]
> = {
  'Technology and Software': [
    'Software Engineering',
    'Technical Program Management',
    'Product Management',
    'UX and UI Design',
    'Data Engineering',
    'Data Science and Analytics',
    'Machine Learning and AI',
    'Cloud and Infrastructure',
    'DevOps and Platform Engineering',
    'Site Reliability Engineering',
    'Cybersecurity and IAM',
    'IT Operations and Service Management',
    'Quality Engineering and Test Automation',
    'Mobile Development',
    'Web Development',
    'Developer Relations',
    'Enterprise Architecture',
    'Business Systems and ERP',
    'IT Compliance and GRC',
  ],
  'Business and Professional Services': [
    'Consulting',
    'Project and Program Management',
    'Operations and Process Improvement',
    'Business Analysis',
    'Strategy',
    'Sales',
    'Marketing and Brand',
    'Customer Success and Support',
    'HR and Talent',
    'Recruiting',
    'Finance and Accounting',
    'Legal',
    'Procurement and Vendor Management',
    'Administrative and Executive Support',
  ],
  'Finance and Insurance': [
    'Banking',
    'Financial Services',
    'Wealth Management',
    'Accounting and Bookkeeping',
    'Tax',
    'Financial Planning and Analysis',
    'Risk Management',
    'Insurance',
    'FinTech',
  ],
  'Healthcare and Life Sciences': [
    'Clinical Care',
    'Public Health',
    'Health IT',
    'Healthcare Operations',
    'Mental Health Services',
    'Medical Devices',
    'Biotechnology',
    'Pharmaceuticals',
    'Research and Clinical Trials',
  ],
  'Education and Training': [
    'K to 12 Education',
    'Higher Education',
    'Adult Education',
    'Corporate Training',
    'Instructional Design',
    'Educational Technology',
    'Tutoring and Coaching',
    'Special Education Support',
    'Curriculum Development',
  ],
  'Government and Public Sector': [
    'Federal Government',
    'State Government',
    'Local Government',
    'Public Administration',
    'Policy and Regulatory',
    'Defense and Security',
    'Emergency Management',
    'Nonprofit Partnerships',
  ],
  'Nonprofit and Social Impact': [
    'Community Services',
    'Advocacy',
    'Workforce Development',
    'Youth Programs',
    'Housing and Homelessness Services',
    'Food Security',
    'Environmental Programs',
    'Fundraising and Development',
    'Volunteer Coordination',
  ],
  'Manufacturing and Industrial': [
    'Manufacturing Operations',
    'Supply Chain',
    'Logistics',
    'Quality and Continuous Improvement',
    'Industrial Engineering',
    'Maintenance and Reliability',
    'Safety and Compliance',
    'Automotive',
    'Aerospace',
    'Electronics Manufacturing',
  ],
  'Retail, E-commerce, and Consumer': [
    'Retail Operations',
    'E-commerce',
    'Merchandising',
    'Customer Experience',
    'Inventory and Fulfillment',
    'Product Marketing',
    'Marketplace Operations',
    'DTC Brands',
  ],
  'Media, Entertainment, and Creative': [
    'Content Creation',
    'Video Production',
    'Audio and Podcasting',
    'Writing and Editing',
    'Graphic Design',
    'Photography',
    'Social Media Management',
    'Marketing Creative',
    'Gaming and Streaming',
  ],
  'Real Estate and Construction': [
    'Real Estate Sales',
    'Property Management',
    'Construction Management',
    'Architecture',
    'Engineering and Design',
    'Facilities Management',
    'Urban Planning',
  ],
  'Transportation and Travel': [
    'Airlines',
    'Public Transit',
    'Travel Operations',
    'Hospitality',
    'Fleet Management',
    'Logistics and Shipping',
  ],
  'Energy and Utilities': [
    'Renewable Energy',
    'Oil and Gas',
    'Utilities Operations',
    'Sustainability',
    'Energy Policy and Compliance',
    'Grid and Infrastructure',
  ],
  'Agriculture and Food': [
    'Farming and Agriculture',
    'Food Production',
    'Restaurants and Hospitality',
    'Food Safety',
    'Supply Chain and Distribution',
  ],
  'Science and Research': [
    'Laboratory Research',
    'Environmental Science',
    'Chemistry',
    'Physics',
    'Data and Computational Research',
    'Academic Research',
  ],
  'Arts, Wellness, and Personal Services': [
    'Wellness and Fitness',
    'Yoga and Mindfulness',
    'Beauty and Personal Care',
    'Coaching and Counseling',
    'Events and Hospitality Services',
  ],
  'Legal and Compliance': [
    'Corporate Legal',
    'Contracts',
    'Privacy',
    'Compliance and Regulatory',
    'Risk and Audit',
    'Governance',
  ],
  Other: ['General', 'Multidisciplinary', 'Prefer not to say'],
};

/** All primary values as a string array for dropdowns that expect string[] */
export const INDUSTRY_PRIMARY_OPTIONS_LIST: string[] = [
  ...INDUSTRY_PRIMARY_OPTIONS,
];

/** Get allowed secondary options for a primary (never includes primary) */
export function getSecondaryOptionsForPrimary(
  primary: string,
): readonly string[] {
  if (!primary) return [];
  const secondaries = INDUSTRY_SECONDARY_BY_PRIMARY[primary as PrimaryIndustry];
  return secondaries ?? [];
}
