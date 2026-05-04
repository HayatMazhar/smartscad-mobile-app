/**
 * Navigate to HR profile: own user → More → Profile; anyone else → More → EmployeeDetail.
 * Works from any tab — always targets the More stack (React Navigation 6 nested action).
 */
function normalizeLoginId(s: string): string {
  return s.trim().toLowerCase().replace(/\\/g, '/');
}

export function openUserProfile(
  navigation: { navigate: (name: string, params?: object) => void },
  args: {
    userId?: string;
    name?: string;
    jobTitle?: string;
    department?: string;
  },
  currentUserId?: string | null,
): void {
  const uid = args.userId?.trim();
  if (!uid) return;

  const self = currentUserId?.trim();
  if (self && normalizeLoginId(uid) === normalizeLoginId(self)) {
    navigation.navigate('More', { screen: 'Profile' });
    return;
  }

  navigation.navigate('More', {
    screen: 'EmployeeDetail',
    params: {
      userId: uid,
      name: args.name,
      jobTitle: args.jobTitle,
      department: args.department,
    },
  });
}
