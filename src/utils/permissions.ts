import { BoardRole, BoardPermissions, Collaborator, Board } from '../store/types/types';

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<BoardRole, BoardPermissions> = {
  admin: {
    canManageColumns: true,
    canManageCollaborators: true,
    canManageSprints: true,
    canGiveManagerReviews: true,
    canDeleteBoard: true,
    canEditBoardSettings: true,
  },
  manager: {
    canManageColumns: true,
    canManageCollaborators: true,
    canManageSprints: true,
    canGiveManagerReviews: true,
    canDeleteBoard: false,
    canEditBoardSettings: false,
  },
  user: {
    canManageColumns: false,
    canManageCollaborators: false,
    canManageSprints: false,
    canGiveManagerReviews: false,
    canDeleteBoard: false,
    canEditBoardSettings: false,
  },
};

// Get user's role in a board
export const getUserRole = (board: Board, userEmail: string): BoardRole | null => {
  // Board creator is always admin
  if (board.createdBy.email === userEmail) {
    return 'admin';
  }

  // Check collaborators
  const collaborator = board.collaborators.find(c => c.email === userEmail);
  return collaborator ? collaborator.role : null;
};

// Get user's permissions in a board
export const getUserPermissions = (board: Board, userEmail: string): BoardPermissions => {
  const role = getUserRole(board, userEmail);
  return role ? ROLE_PERMISSIONS[role] : {
    canManageColumns: false,
    canManageCollaborators: false,
    canManageSprints: false,
    canGiveManagerReviews: false,
    canDeleteBoard: false,
    canEditBoardSettings: false,
  };
};

// Check if user has specific permission
export const hasPermission = (
  board: Board, 
  userEmail: string, 
  permission: keyof BoardPermissions
): boolean => {
  const permissions = getUserPermissions(board, userEmail);
  return permissions[permission];
};

// Check if user is admin
export const isAdmin = (board: Board, userEmail: string): boolean => {
  return getUserRole(board, userEmail) === 'admin';
};

// Check if user is manager or admin
export const isManagerOrAdmin = (board: Board, userEmail: string): boolean => {
  const role = getUserRole(board, userEmail);
  return role === 'manager' || role === 'admin';
};

// Check if user can give manager reviews
export const canGiveManagerReviews = (board: Board, userEmail: string): boolean => {
  return hasPermission(board, userEmail, 'canGiveManagerReviews');
};

// Get all users with manager or admin roles
export const getManagersAndAdmins = (board: Board): Collaborator[] => {
  return board.collaborators.filter(c => c.role === 'manager' || c.role === 'admin');
};

// Validate role assignment (only admins can assign manager roles)
export const canAssignRole = (
  board: Board, 
  assignerEmail: string, 
  targetRole: BoardRole
): boolean => {
  const assignerRole = getUserRole(board, assignerEmail);
  
  // Only admins can assign roles
  if (assignerRole !== 'admin') {
    return false;
  }
  
  // Admins can assign any role
  return true;
};

// Get role display name
export const getRoleDisplayName = (role: BoardRole): string => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Manager';
    case 'user':
      return 'User';
    default:
      return 'Unknown';
  }
};

// Get role description
export const getRoleDescription = (role: BoardRole): string => {
  switch (role) {
    case 'admin':
      return 'Full access to all board features including settings and user management';
    case 'manager':
      return 'Can manage tasks, sprints, and give manager reviews';
    case 'user':
      return 'Can view and work on assigned tasks';
    default:
      return 'Unknown role';
  }
};
