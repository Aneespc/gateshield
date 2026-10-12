/**
 * Policy Engine Core Types
 * Pure types representing zero-trust access evaluation context, conditions, definitions, and decisions.
 */

export type PolicyAction = "ALLOW" | "DENY" | "STEP_UP";

export type RoleCondition = {
  field: "role";
  op: "in" | "not_in";
  value: string[];
};

export type DeviceSecureCondition = {
  field: "deviceSecure";
  op: "eq";
  value: boolean;
};

export type CountryCondition = {
  field: "country";
  op: "in" | "not_in";
  value: string[]; // ISO country codes
};

export type TimeOfDayCondition = {
  field: "timeOfDay";
  op: "between";
  value: {
    start: string; // "HH:MM"
    end: string; // "HH:MM"
  };
};

export type Condition =
  | RoleCondition
  | DeviceSecureCondition
  | CountryCondition
  | TimeOfDayCondition;

export type PolicyDefinition = {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  action: PolicyAction;
  conditions: Condition[];
};

export type RequestContext = {
  userId?: string;
  role?: string;
  deviceSecure?: boolean;
  country?: string;
  timestamp: Date;
  path: string;
  method: string;
  appId?: string;
};

export type Decision = {
  action: PolicyAction;
  reason: string;
  matchedPolicyId: string | null;
};
