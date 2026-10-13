/**
 * Fictional Datasets for Protected Upstream Dummy Applications
 *
 * NOTE: All data here is completely fictional for simulation and demonstration.
 * Emails strictly use the @example.com reserved domain, and phone numbers reside
 * in the 555-0100 through 555-0199 fictional telephone exchange.
 */

// -------------------------------------------------------------
// HR Portal Data (/apps/hr)
// -------------------------------------------------------------

export interface Employee {
  id: string;
  name: string;
  department: string;
  title: string;
  email: string;
  startDate: string;
  manager: string;
  phone: string;
}

export const EMPLOYEES: Employee[] = [
  {
    id: "emp-01",
    name: "Elena Rostova",
    department: "Security",
    title: "Staff Security Architect",
    email: "elena.rostova@example.com",
    startDate: "2021-03-15",
    manager: "Marcus Vance",
    phone: "555-0142",
  },
  {
    id: "emp-02",
    name: "Marcus Vance",
    department: "Engineering",
    title: "VP of Systems Engineering",
    email: "marcus.vance@example.com",
    startDate: "2019-01-10",
    manager: "Sarah Lin",
    phone: "555-0143",
  },
  {
    id: "emp-03",
    name: "Priya Sharma",
    department: "Product",
    title: "Principal Product Director",
    email: "priya.sharma@example.com",
    startDate: "2020-06-01",
    manager: "Sarah Lin",
    phone: "555-0144",
  },
  {
    id: "emp-04",
    name: "Lucas Dubois",
    department: "Design",
    title: "Lead Design Technologist",
    email: "lucas.dubois@example.com",
    startDate: "2022-02-20",
    manager: "Priya Sharma",
    phone: "555-0145",
  },
  {
    id: "emp-05",
    name: "Amara Okafor",
    department: "Human Resources",
    title: "Director of People Operations",
    email: "amara.okafor@example.com",
    startDate: "2018-11-04",
    manager: "Sarah Lin",
    phone: "555-0146",
  },
  {
    id: "emp-06",
    name: "Kaito Tanaka",
    department: "Finance",
    title: "Senior Financial Controller",
    email: "kaito.tanaka@example.com",
    startDate: "2021-08-15",
    manager: "Rachel Kim",
    phone: "555-0147",
  },
  {
    id: "emp-07",
    name: "Rachel Kim",
    department: "Finance",
    title: "Chief Financial Officer",
    email: "rachel.kim@example.com",
    startDate: "2017-05-12",
    manager: "Sarah Lin",
    phone: "555-0148",
  },
  {
    id: "emp-08",
    name: "Devon Carter",
    department: "Human Resources",
    title: "Talent Acquisition Lead",
    email: "devon.carter@example.com",
    startDate: "2023-01-08",
    manager: "Amara Okafor",
    phone: "555-0149",
  },
  {
    id: "emp-09",
    name: "Sofia Rossi",
    department: "Legal & Privacy",
    title: "Senior Corporate Counsel",
    email: "sofia.rossi@example.com",
    startDate: "2020-09-27",
    manager: "Sarah Lin",
    phone: "555-0150",
  },
  {
    id: "emp-10",
    name: "Liam O'Connor",
    department: "Infrastructure",
    title: "Site Reliability Architect",
    email: "liam.oconnor@example.com",
    startDate: "2021-11-14",
    manager: "Marcus Vance",
    phone: "555-0151",
  },
  {
    id: "emp-11",
    name: "Zoe Washington",
    department: "Engineering",
    title: "Senior Software Engineer",
    email: "zoe.washington@example.com",
    startDate: "2022-07-10",
    manager: "Elena Rostova",
    phone: "555-0152",
  },
  {
    id: "emp-12",
    name: "Noah Al-Mansoor",
    department: "Security",
    title: "Threat Detection Engineer",
    email: "noah.almansoor@example.com",
    startDate: "2023-03-01",
    manager: "Elena Rostova",
    phone: "555-0153",
  },
];

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  status: "Approved" | "Pending" | "Reviewed";
}

export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "leave-101",
    employeeId: "emp-01",
    employeeName: "Elena Rostova",
    type: "Annual Leave",
    startDate: "2026-11-02",
    endDate: "2026-11-06",
    status: "Approved",
  },
  {
    id: "leave-102",
    employeeId: "emp-06",
    employeeName: "Kaito Tanaka",
    type: "Parental Leave",
    startDate: "2026-10-20",
    endDate: "2026-11-20",
    status: "Approved",
  },
  {
    id: "leave-103",
    employeeId: "emp-04",
    employeeName: "Lucas Dubois",
    type: "Conference & Workshop",
    startDate: "2026-10-28",
    endDate: "2026-10-30",
    status: "Pending",
  },
  {
    id: "leave-104",
    employeeId: "emp-08",
    employeeName: "Devon Carter",
    type: "Medical Leave",
    startDate: "2026-10-15",
    endDate: "2026-10-16",
    status: "Approved",
  },
  {
    id: "leave-105",
    employeeId: "emp-11",
    employeeName: "Zoe Washington",
    type: "Personal Leave",
    startDate: "2026-12-24",
    endDate: "2026-12-24",
    status: "Pending",
  },
];

export function getEmployeeById(id: string): Employee | null {
  return EMPLOYEES.find((e) => e.id.toLowerCase() === id.toLowerCase()) ?? null;
}

// -------------------------------------------------------------
// Finance Hub Data (/apps/finance)
// -------------------------------------------------------------

export interface Invoice {
  id: string;
  vendor: string;
  amount: number;
  status: "Pending" | "Approved" | "Paid";
  dueDate: string;
  description: string;
}

export const INVOICES: Invoice[] = [
  {
    id: "inv-101",
    vendor: "CloudScale Infrastructure LLC",
    amount: 14250.0,
    status: "Pending",
    dueDate: "2026-11-01",
    description: "Q4 Multi-region dedicated compute clusters & VPC peering",
  },
  {
    id: "inv-102",
    vendor: "CyberShield Endpoint Technologies",
    amount: 28500.0,
    status: "Approved",
    dueDate: "2026-10-25",
    description: "Annual enterprise fleet endpoint telemetry & attestation license",
  },
  {
    id: "inv-103",
    vendor: "DataStream Metrics Analytics",
    amount: 6800.5,
    status: "Paid",
    dueDate: "2026-10-15",
    description: "Monthly observability log pipeline ingestion & cold storage",
  },
  {
    id: "inv-104",
    vendor: "Apex Silicon Workstations",
    amount: 4120.0,
    status: "Pending",
    dueDate: "2026-11-15",
    description: "Hardware token & developer engineering laptop upgrade",
  },
  {
    id: "inv-105",
    vendor: "Veritas Compliance Audit Group",
    amount: 35000.0,
    status: "Approved",
    dueDate: "2026-10-30",
    description: "Annual SOC2 Type II audit independent review & testing",
  },
  {
    id: "inv-106",
    vendor: "Northwind Secure Logistics",
    amount: 480.0,
    status: "Paid",
    dueDate: "2026-10-05",
    description: "Encrypted HSM backup key dispatch & courier service",
  },
  {
    id: "inv-107",
    vendor: "OmniNet Dark Fiber Solutions",
    amount: 2150.0,
    status: "Pending",
    dueDate: "2026-11-05",
    description: "Dedicated primary data center cross-connect interconnect",
  },
  {
    id: "inv-108",
    vendor: "Beacon Identity Gateways",
    amount: 12900.0,
    status: "Pending",
    dueDate: "2026-11-20",
    description: "Cloud identity synchronization connector & SCIM gateway",
  },
  {
    id: "inv-109",
    vendor: "Synthetix Design Research",
    amount: 8400.0,
    status: "Approved",
    dueDate: "2026-10-28",
    description: "Accessibility design token system audit & UX evaluation",
  },
  {
    id: "inv-110",
    vendor: "Global Regulatory Advisory LLP",
    amount: 19200.0,
    status: "Paid",
    dueDate: "2026-10-10",
    description: "Cross-border data residency and sovereign compliance advisory",
  },
];

export interface PayrollSummary {
  payPeriod: string;
  totalGrossPay: string;
  headcount: number;
  currency: string;
  departmentBreakdown: { department: string; allocation: string; count: number }[];
}

export const PAYROLL_SUMMARY: PayrollSummary = {
  payPeriod: "October 01, 2026 – October 31, 2026",
  totalGrossPay: "$412,850.00",
  headcount: 48,
  currency: "USD",
  departmentBreakdown: [
    { department: "Systems Engineering", allocation: "$185,200.00", count: 22 },
    { department: "Product & Design", allocation: "$68,400.00", count: 8 },
    { department: "Security & Operations", allocation: "$72,150.00", count: 8 },
    { department: "Finance & Treasury", allocation: "$48,600.00", count: 5 },
    { department: "People Operations", allocation: "$38,500.00", count: 5 },
  ],
};

export function getInvoiceById(id: string): Invoice | null {
  return INVOICES.find((i) => i.id.toLowerCase() === id.toLowerCase()) ?? null;
}

// -------------------------------------------------------------
// Admin Console Data (/apps/admin)
// -------------------------------------------------------------

export interface SystemAccount {
  id: string;
  username: string;
  role: string;
  status: "Active" | "Disabled" | "Locked";
  lastLogin: string;
  mfaEnforced: boolean;
}

export const SYSTEM_ACCOUNTS: SystemAccount[] = [
  {
    id: "acc-01",
    username: "alice.admin",
    role: "Global Administrator",
    status: "Active",
    lastLogin: "2026-10-12 11:45 UTC",
    mfaEnforced: true,
  },
  {
    id: "acc-02",
    username: "bob.finance",
    role: "Finance Auditor",
    status: "Active",
    lastLogin: "2026-10-12 09:12 UTC",
    mfaEnforced: true,
  },
  {
    id: "acc-03",
    username: "carol.hr",
    role: "HR Operations",
    status: "Active",
    lastLogin: "2026-10-11 16:30 UTC",
    mfaEnforced: true,
  },
  {
    id: "acc-04",
    username: "dave.intern",
    role: "Trainee / Read-Only",
    status: "Active",
    lastLogin: "2026-10-10 14:05 UTC",
    mfaEnforced: false,
  },
  {
    id: "acc-05",
    username: "service.gateway-sync",
    role: "Automated Service Account",
    status: "Active",
    lastLogin: "2026-10-12 13:00 UTC",
    mfaEnforced: true,
  },
  {
    id: "acc-06",
    username: "sec.ops-oncall",
    role: "SOC Incident Responder",
    status: "Active",
    lastLogin: "2026-10-12 04:20 UTC",
    mfaEnforced: true,
  },
  {
    id: "acc-07",
    username: "legacy.backup-batch",
    role: "Archived Processor",
    status: "Disabled",
    lastLogin: "2025-12-01 00:00 UTC",
    mfaEnforced: false,
  },
];

export interface SystemSetting {
  category: string;
  name: string;
  value: string;
  status: "Enforced" | "Active" | "Configured";
  description: string;
}

export const SYSTEM_SETTINGS: SystemSetting[] = [
  {
    category: "Identity & Session",
    name: "Global Session Maximum Lifetime",
    value: "8 Hours",
    status: "Enforced",
    description: "Session cookies expire after 8 hours of total age.",
  },
  {
    category: "Identity & Session",
    name: "Admin Step-Up Re-Authentication Window",
    value: "15 Minutes",
    status: "Enforced",
    description: "Requires freshly validated credentials (authAge ≤ 15m) for sensitive apps.",
  },
  {
    category: "Transport Security",
    name: "Strict Transport Security (HSTS)",
    value: "max-age=63072000; includeSubDomains",
    status: "Enforced",
    description: "Enforces strict HTTPS browser transport across all subdomains.",
  },
  {
    category: "Transport Security",
    name: "Minimum Permitted Cipher TLS Version",
    value: "TLS 1.3",
    status: "Enforced",
    description: "Legacy ciphers and TLS 1.0/1.1 are permanently disabled.",
  },
  {
    category: "Zero Trust Perimeter",
    name: "Bypass Protection Shared Secret",
    value: "Active (x-gateway-secret)",
    status: "Active",
    description: "Upstream rejects all requests lacking trusted gateway signature.",
  },
  {
    category: "Auditing & Compliance",
    name: "Audit Trail Storage Engine",
    value: "Append-Only PostgreSQL",
    status: "Configured",
    description: "Evaluations recorded before proxying with reason and policy IDs.",
  },
];
