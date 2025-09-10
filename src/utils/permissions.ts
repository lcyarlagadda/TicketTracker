import { BoardRole, BoardPermissions, Collaborator, Board } from '../store/types/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

// Get user's role in a board from the new boardAccess collection
export const getUserRole = async (boardId: string, userId: string): Promise<BoardRole | null> => {
  try {
    const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
    if (accessDoc.exists()) {
      return accessDoc.data().role as BoardRole;
    }
    return null;
  } catch (error) {
    // Error('Error getting user role:', error);
    return null;
  }
};

// Legacy method for backward compatibility (deprecated)
export const getUserRoleLegacy = (board: Board, userEmail: string): BoardRole | null => {
  // Board creator is always admin
  if (board.createdBy.email === userEmail) {
    return 'admin';
  }

  // Check collaborators
  const collaborator = board.collaborators.find(c => c.email === userEmail);
  return collaborator ? collaborator.role : null;
};

// Get user's permissions in a board (async version for new structure)
export const getUserPermissions = async (boardId: string, userId: string): Promise<BoardPermissions> => {
  const role = await getUserRole(boardId, userId);
  return role ? ROLE_PERMISSIONS[role] : {
    canManageColumns: false,
    canManageCollaborators: false,
    canManageSprints: false,
    canGiveManagerReviews: false,
    canDeleteBoard: false,
    canEditBoardSettings: false,
  };
};

// Legacy method for backward compatibility (deprecated)
export const getUserPermissionsLegacy = (board: Board, userEmail: string): BoardPermissions => {
  const role = getUserRoleLegacy(board, userEmail);
  return role ? ROLE_PERMISSIONS[role] : {
    canManageColumns: false,
    canManageCollaborators: false,
    canManageSprints: false,
    canGiveManagerReviews: false,
    canDeleteBoard: false,
    canEditBoardSettings: false,
  };
};

// Check if user has specific permission (async version for new structure)
export const hasPermission = async (
  boardId: string, 
  userId: string, 
  permission: keyof BoardPermissions
): Promise<boolean> => {
  const permissions = await getUserPermissions(boardId, userId);
  return permissions[permission];
};

// Legacy method for backward compatibility (deprecated)
export const hasPermissionLegacy = (
  board: Board, 
  userEmail: string, 
  permission: keyof BoardPermissions
): boolean => {
  const permissions = getUserPermissionsLegacy(board, userEmail);
  return permissions[permission];
};

// Check if user is admin (async version for new structure)
export const isAdmin = async (boardId: string, userId: string): Promise<boolean> => {
  return (await getUserRole(boardId, userId)) === 'admin';
};

// Legacy method for backward compatibility (deprecated)
export const isAdminLegacy = (board: Board, userEmail: string): boolean => {
  return getUserRoleLegacy(board, userEmail) === 'admin';
};

// Check if user is manager or admin (async version for new structure)
export const isManagerOrAdmin = async (boardId: string, userId: string): Promise<boolean> => {
  const role = await getUserRole(boardId, userId);
  return role === 'manager' || role === 'admin';
};

// Legacy method for backward compatibility (deprecated)
export const isManagerOrAdminLegacy = (board: Board, userEmail: string): boolean => {
  const role = getUserRoleLegacy(board, userEmail);
  return role === 'manager' || role === 'admin';
};

// Check if user can give manager reviews (async version for new structure)
export const canGiveManagerReviews = async (boardId: string, userId: string): Promise<boolean> => {
  return await hasPermission(boardId, userId, 'canGiveManagerReviews');
};

// Legacy method for backward compatibility (deprecated)
export const canGiveManagerReviewsLegacy = (board: Board, userEmail: string): boolean => {
  return hasPermissionLegacy(board, userEmail, 'canGiveManagerReviews');
};

// Get all users with manager or admin roles (legacy method - deprecated)
export const getManagersAndAdmins = (board: Board): Collaborator[] => {
  return board.collaborators.filter(c => c.role === 'manager' || c.role === 'admin');
};

// Validate role assignment (async version for new structure)
export const canAssignRole = async (
  boardId: string, 
  assignerUserId: string, 
  targetRole: BoardRole
): Promise<boolean> => {
  const assignerRole = await getUserRole(boardId, assignerUserId);
  
  // Only admins can assign roles
  if (assignerRole !== 'admin') {
    return false;
  }
  
  // Admins can assign any role
  return true;
};

// Legacy method for backward compatibility (deprecated)
export const canAssignRoleLegacy = (
  board: Board, 
  assignerEmail: string, 
  targetRole: BoardRole
): boolean => {
  const assignerRole = getUserRoleLegacy(board, assignerEmail);
  
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
