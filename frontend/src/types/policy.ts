export type PolicyEffect = 'PERMIT' | 'DENY';

export type PolicyCategory = 
  | 'Data Protection'
  | 'API & Microservices'
  | 'Administrative Access'
  | 'Compliance & Audit'
  | 'Network & Geofence';

export interface SubjectRule {
  role?: string[];
  clearanceLevel?: number | string;
  department?: string[];
  mfaEnforced?: boolean;
}

export interface ResourceRule {
  type: string;
  classification: 'Public' | 'Internal' | 'Confidential' | 'Restricted' | 'Top Secret';
  service?: string;
  ownerDepartment?: string;
}

export interface EnvironmentRule {
  ipRange?: string;
  allowedHours?: string;
  geofence?: string[];
  deviceTrust?: 'Compliant' | 'Managed' | 'Any';
}

export interface AbacPolicy {
  id: string;
  code: string;
  title: string;
  description: string;
  category: PolicyCategory;
  effect: PolicyEffect;
  enabled: boolean;
  priority: number;
  actions: ('CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'EXPORT')[];
  subject: SubjectRule;
  resource: ResourceRule;
  environment: EnvironmentRule;
  lastUpdated: string;
  version: string;
}

export type NavigationTab = 
  | 'dashboard'
  | 'users'
  | 'resources'
  | 'policies'
  | 'simulator'
  | 'audit'
  | 'settings';
