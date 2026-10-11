// Bounded demo policy: no object search, payload handling, or dynamic evaluation.
export function validatePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('Policy object required');
  if (Object.keys(policy).join(',') !== 'roles') throw new Error('Only roles are supported');
  const roles = policy.roles;
  if (!roles || typeof roles !== 'object' || Array.isArray(roles)) throw new Error('roles required');
  if (Object.keys(roles).sort().join(',') !== 'member,reviewer') throw new Error('Only member and reviewer roles supported');
  for (const [role, grants] of Object.entries(roles)) {
    const allowed = role === 'member' ? ['read:own'] : ['read:own', 'write:own'];
    if (!Array.isArray(grants) || grants.some(grant => !allowed.includes(grant)) || new Set(grants).size !== grants.length) throw new Error('Unsupported grant');
  }
  return structuredClone(policy);
}

export function evaluatePolicy(subject, object, action, policy) {
  if (!subject) return {allowed: false, reason: 'authentication-required'};
  if (subject.tenant !== object.tenant) return {allowed: false, reason: 'tenant-mismatch'};
  if (subject.id !== object.owner) return {allowed: false, reason: 'owner-mismatch'};
  if (!policy.roles[subject.role]?.includes(`${action}:own`)) return {allowed: false, reason: 'role-permission-missing'};
  return {allowed: true, reason: 'owner-and-role-match'};
}
