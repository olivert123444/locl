// Helper functions for user profile handling

/**
 * Helper function to get a user's display name directly from the users table
 * 
 * @param user The user object from the database
 * @returns The most appropriate name for display
 */
export const getUserDisplayName = (user: any): string => {
  if (!user) return 'Unknown User';
  return (
    user.full_name ||
    user.email?.split('@')[0] ||
    'Unknown User'
  );
};

/**
 * Formats a user profile for display in the UI
 * Ensures all necessary fields are present with fallbacks
 * 
 * @param profile The raw user profile from the database
 * @param role The user's role (Buyer/Seller)
 * @returns A formatted user profile with all necessary fields
 */
export const formatUserProfile = (profile: any, role: string) => {
  if (!profile) return {
    id: 'unknown',
    name: `Unknown ${role}`,
    avatar_url: null,
    role
  };
  
  return {
    id: profile.id || 'unknown',
    name: getUserDisplayName(profile),
    avatar_url: profile.avatar_url || null,
    role
  };
};
