// services/boardService.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '../firebase';
import { Board, BoardRole, Collaborator } from '../store/types/types';
import { notificationService } from './notificationService';

class BoardService {
  // Fetch all boards for a user (owned + shared)
  async fetchUserBoards(userId: string, userEmail?: string): Promise<Board[]> {
    try {
      // Get all board IDs the user has access to
      const boardAccessQuery = query(
        collection(db, 'boardAccess'),
        where('userId', '==', userId)
      );
      const accessSnapshot = await getDocs(boardAccessQuery);
      const boardIds = [...new Set(accessSnapshot.docs.map(doc => doc.data().boardId))]; // Remove duplicates

      if (boardIds.length === 0) {
        return [];
      }

      // Fetch all boards the user has access to
      const boardsWithNulls = await Promise.all(
        boardIds.map(async (boardId) => {
          try {
            const boardDoc = await getDoc(doc(db, 'boards', boardId));
            if (boardDoc.exists()) {
              return { id: boardDoc.id, ...boardDoc.data() } as Board;
            }
          } catch (error) {
            // Error('Error fetching board:', error);
          }
          return null;
        })
      );

      // Filter out null values and sort by creation date
      const boards = boardsWithNulls.filter(board => board !== null) as Board[];
      return boards.sort((a, b) => {
        const aTime = (a.createdAt as any)?.toDate?.() || 
          (typeof a.createdAt === 'string' ? new Date(a.createdAt) : new Date());
        const bTime = (b.createdAt as any)?.toDate?.() || 
          (typeof b.createdAt === 'string' ? new Date(b.createdAt) : new Date());
        return bTime.getTime() - aTime.getTime();
      });
    } catch (error) {
      // Error('Error fetching boards:', error);
      throw error;
    }
  }

  // Listen to boards in real-time
  subscribeToBoards(userId: string, callback: (boards: Board[]) => void): Unsubscribe {
    // Listen to board access changes for this user
    const boardAccessQuery = query(
      collection(db, 'boardAccess'),
      where('userId', '==', userId)
    );
    
    return onSnapshot(boardAccessQuery, async (accessSnapshot) => {
      const boardIds = [...new Set(accessSnapshot.docs.map(doc => doc.data().boardId))]; // Remove duplicates
      
      if (boardIds.length === 0) {
        callback([]);
        return;
      }

      // Fetch all boards the user has access to
      const boardsWithNulls = await Promise.all(
        boardIds.map(async (boardId) => {
          try {
            const boardDoc = await getDoc(doc(db, 'boards', boardId));
            if (boardDoc.exists()) {
              return { id: boardDoc.id, ...boardDoc.data() } as Board;
            }
          } catch (error) {
            // Error('Error fetching board:', error);
          }
          return null;
        })
      );

      // Filter out null values and sort by creation date
      const boards = boardsWithNulls.filter(board => board !== null) as Board[];
      const sortedBoards = boards.sort((a, b) => {
        const aTime = (a.createdAt as any)?.toDate?.() || 
          (typeof a.createdAt === 'string' ? new Date(a.createdAt) : new Date());
        const bTime = (b.createdAt as any)?.toDate?.() || 
          (typeof b.createdAt === 'string' ? new Date(b.createdAt) : new Date());
        return bTime.getTime() - aTime.getTime();
      });
      
      callback(sortedBoards);
    });
  }

  // Create a new board
  async createBoard(userId: string, boardData: Omit<Board, 'id'>): Promise<Board> {
    try {
      const boardId = uuidv4();
      let imageUrl = '';

      // Handle image upload if present
      if (boardData.imageFile) {
        const imageRef = ref(storage, `boards/${boardId}/${boardData.imageFile.name}`);
        await uploadBytes(imageRef, boardData.imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      const newBoard = {
        ...boardData,
        imageUrl,
        createdAt: new Date().toISOString(),
      };

      delete (newBoard as any).imageFile; // don't persist File in Firestore

      // Create board in global boards collection
      await setDoc(doc(db, 'boards', boardId), newBoard);

      // Grant admin access to the creator
      // Creating board access for creator
      await setDoc(doc(db, 'boardAccess', `${boardId}_${userId}`), {
        boardId,
        userId,
        role: 'admin' as BoardRole,
        grantedAt: serverTimestamp(),
        grantedBy: userId
      });
      // Board access created successfully

      // Share board with collaborators (create pending access entries)
      if (boardData.collaborators && boardData.collaborators.length > 0) {
        const sharingPromises = boardData.collaborators
          .filter((collaborator: Collaborator) => collaborator.email !== boardData.createdBy.email) // Don't share with creator again
          .map((collaborator: Collaborator) => 
            this.shareBoardWithCollaborator(userId, boardId, collaborator.email, collaborator.role)
          );
        
        await Promise.all(sharingPromises);
      }

      return { id: boardId, ...newBoard } as Board;
    } catch (error) {
      // Error('Error creating board:', error);
      throw error;
    }
  }


  // Fetch a specific board
  async fetchBoard(userId: string, boardId: string): Promise<Board> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        throw new Error('Access denied to board');
      }

      const boardDoc = await getDoc(doc(db, 'boards', boardId));
      if (!boardDoc.exists()) {
        throw new Error('Board not found');
      }
      return { id: boardDoc.id, ...boardDoc.data() } as Board;
    } catch (error) {
      // Error('Error fetching board:', error);
      throw error;
    }
  }

  // Update board
  async updateBoard(userId: string, boardId: string, updates: Partial<Board>): Promise<void> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        throw new Error('Access denied to board');
      }

      const boardRef = doc(db, 'boards', boardId);
      await updateDoc(boardRef, updates);
    } catch (error) {
      // Error('Error updating board:', error);
      throw error;
    }
  }

  // Share board with collaborator
  async shareBoardWithCollaborator(ownerId: string, boardId: string, collaboratorEmail: string, role: BoardRole = 'user'): Promise<void> {
    try {
      // Get board information for notifications
      const boardDoc = await getDoc(doc(db, 'boards', boardId));
      if (!boardDoc.exists()) {
        throw new Error('Board not found');
      }
      const board = boardDoc.data() as Board;
      
      // Get owner information for notifications
      const ownerDoc = await getDoc(doc(db, 'users', ownerId));
      const ownerName = ownerDoc.exists() ? ownerDoc.data().displayName || ownerDoc.data().email : 'Unknown User';
      
      // First, check if there's a user with this email in our users collection
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', collaboratorEmail)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        // User exists, grant immediate access
        const userDoc = userSnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        await setDoc(doc(db, 'boardAccess', `${boardId}_${userId}`), {
          boardId,
          userId,
          role,
          grantedAt: serverTimestamp(),
          grantedBy: ownerId
        });
        
        // Board shared with existing user (immediate access granted)
        
        // Send notification to existing user
        notificationService.notifyCollaboratorAdded({
          collaboratorEmail,
          collaboratorName: userData.displayName || userData.email,
          boardName: board.title,
          addedBy: ownerName,
          boardUrl: `${window.location.origin}/board/${boardId}`
        });
      } else {
        // User doesn't exist yet, create pending access
        await setDoc(doc(db, 'pendingBoardAccess', `${boardId}_${collaboratorEmail.replace(/[^a-zA-Z0-9]/g, '_')}`), {
          boardId,
          collaboratorEmail,
          role,
          sharedAt: serverTimestamp(),
          sharedBy: ownerId
        });
        
        // Board shared with new user (pending access created)
        
        // Send notification to new user (they'll get access when they sign up)
        notificationService.notifyCollaboratorAdded({
          collaboratorEmail,
          collaboratorName: collaboratorEmail.split('@')[0], // Use email prefix as name
          boardName: board.title,
          addedBy: ownerName,
          boardUrl: `${window.location.origin}/board/${boardId}`
        });
      }
    } catch (error) {
      // Error('Error sharing board:', error);
      throw error;
    }
  }

  // Grant board access to a user (called when user accepts invitation or signs up)
  async grantBoardAccess(userId: string, boardId: string, role: BoardRole = 'user'): Promise<void> {
    try {
      await setDoc(doc(db, 'boardAccess', `${boardId}_${userId}`), {
        boardId,
        userId,
        role,
        grantedAt: serverTimestamp()
      });
    } catch (error) {
      // Error('Error granting board access:', error);
      throw error;
    }
  }

  // Check and grant pending board access for a user (call this when user logs in)
  async grantPendingAccessForUser(userId: string, userEmail: string): Promise<void> {
    try {
      // Get all pending access entries for this user's email
      const pendingAccessQuery = query(
        collection(db, 'pendingBoardAccess'),
        where('collaboratorEmail', '==', userEmail)
      );
      const pendingSnapshot = await getDocs(pendingAccessQuery);
      
      if (pendingSnapshot.empty) {
        return; // No pending access
      }

      // Grant access for each pending board
      const grantPromises = pendingSnapshot.docs.map(async (doc) => {
        const pendingAccess = doc.data();
        const boardId = pendingAccess.boardId;
        const role = pendingAccess.role;
        
        // Grant access
        await this.grantBoardAccess(userId, boardId, role);
        
        // Remove from pending
        await deleteDoc(doc.ref);
        
        // Granted access to board for user
      });
      
      await Promise.all(grantPromises);
    } catch (error) {
      // Error('Error granting pending access:', error);
      throw error;
    }
  }

  // Remove board access from collaborator
  async removeBoardAccess(userId: string, boardId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
    } catch (error) {
      // Error('Error removing board access:', error);
      throw error;
    }
  }

  // Unshare board with collaborator (remove from pending access)
  async unshareBoardWithCollaborator(collaboratorEmail: string, boardId: string): Promise<void> {
    try {
      // Remove from pending access
      await deleteDoc(doc(db, 'pendingBoardAccess', `${boardId}_${collaboratorEmail.replace(/[^a-zA-Z0-9]/g, '_')}`));
    } catch (error) {
      // Error('Error unsharing board:', error);
      throw error;
    }
  }

  // Delete board and all associated data
  async deleteBoard(userId: string, boardId: string): Promise<void> {
    try {
      // Check if user has admin access to delete the board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists() || accessDoc.data().role !== 'admin') {
        throw new Error('Access denied: Only board admins can delete boards');
      }

      // Log(`Starting comprehensive deletion of board ${boardId}`);

      // 1. Delete all tasks for this board (including their file attachments)
      await this.deleteAllBoardTasks(boardId);
      // Log(`Deleted all tasks for board ${boardId}`);

      // 2. Delete board image from storage if it exists
      await this.deleteBoardImage(boardId);
      // Log(`Deleted board image for board ${boardId}`);

      // 3. Delete all sprints for this board
      await this.deleteAllBoardSprints(boardId);
      // Log(`Deleted all sprints for board ${boardId}`);

      // 4. Delete all private reflections for this board's sprints
      await this.deleteAllBoardPrivateReflections(boardId);
      // Log(`Deleted all private reflections for board ${boardId}`);

      // 5. Delete all board access entries
      await this.deleteAllBoardAccess(boardId);
      // Log(`Deleted all board access entries for board ${boardId}`);

      // 6. Delete all pending board access entries
      await this.deleteAllPendingBoardAccess(boardId);
      // Log(`Deleted all pending board access entries for board ${boardId}`);

      // 7. Delete the board itself
      await deleteDoc(doc(db, 'boards', boardId));
      // Log(`Deleted board ${boardId}`);

      // Log(`Successfully completed comprehensive deletion of board ${boardId}`);
    } catch (error) {
      // Error('Error deleting board:', error);
      throw error;
    }
  }

  // Delete all tasks for a board (including their file attachments)
  private async deleteAllBoardTasks(boardId: string): Promise<void> {
    try {
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('boardId', '==', boardId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      
      if (!tasksSnapshot.empty) {
        // Delete file attachments for each task
        const deleteAttachmentPromises = tasksSnapshot.docs.map(async (taskDoc) => {
          const taskId = taskDoc.id;
          try {
            // Delete all files in the attachments/{taskId}/ folder
            const attachmentsRef = ref(storage, `attachments/${taskId}`);
            const attachmentsList = await listAll(attachmentsRef);
            
            if (attachmentsList.items.length > 0) {
              const deleteFilePromises = attachmentsList.items.map(fileRef => deleteObject(fileRef));
              await Promise.all(deleteFilePromises);
              // Log(`Deleted ${attachmentsList.items.length} file attachments for task ${taskId}`);
            }
          } catch (error) {
            // Log error but don't fail the entire operation if file deletion fails
            // Warn(`Failed to delete attachments for task ${taskId}:`, error);
          }
        });
        
        await Promise.all(deleteAttachmentPromises);
        
        // Delete the task documents
        const deleteTaskPromises = tasksSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteTaskPromises);
        // Log(`Deleted ${tasksSnapshot.docs.length} tasks for board ${boardId}`);
      }
    } catch (error) {
      // Error('Error deleting board tasks:', error);
      throw error;
    }
  }

  // Delete board image from storage
  private async deleteBoardImage(boardId: string): Promise<void> {
    try {
      // Get the board document to check if it has an imageUrl
      const boardDoc = await getDoc(doc(db, 'boards', boardId));
      if (boardDoc.exists()) {
        const boardData = boardDoc.data();
        if (boardData.imageUrl) {
          try {
            // Extract the file path from the imageUrl
            // Firebase Storage URLs typically contain the path after the domain
            const url = new URL(boardData.imageUrl);
            const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
            if (pathMatch) {
              const filePath = decodeURIComponent(pathMatch[1]);
              const imageRef = ref(storage, filePath);
              await deleteObject(imageRef);
              // Log(`Deleted board image: ${filePath}`);
            }
          } catch (error) {
            // Log error but don't fail the entire operation if image deletion fails
            // Warn(`Failed to delete board image for board ${boardId}:`, error);
          }
        }
      }
    } catch (error) {
      // Log error but don't fail the entire operation if image deletion fails
      // Warn(`Failed to delete board image for board ${boardId}:`, error);
    }
  }

  // Delete all sprints for a board
  private async deleteAllBoardSprints(boardId: string): Promise<void> {
    try {
      const sprintsQuery = query(
        collection(db, 'sprints'),
        where('boardId', '==', boardId)
      );
      const sprintsSnapshot = await getDocs(sprintsQuery);
      
      if (!sprintsSnapshot.empty) {
        const deleteSprintPromises = sprintsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteSprintPromises);
        // Log(`Deleted ${sprintsSnapshot.docs.length} sprints for board ${boardId}`);
      }
    } catch (error) {
      // Error('Error deleting board sprints:', error);
      throw error;
    }
  }

  // Delete all private reflections for a board's sprints
  private async deleteAllBoardPrivateReflections(boardId: string): Promise<void> {
    try {
      // First, get all sprints for this board to get their IDs
      const sprintsQuery = query(
        collection(db, 'sprints'),
        where('boardId', '==', boardId)
      );
      const sprintsSnapshot = await getDocs(sprintsQuery);
      
      if (!sprintsSnapshot.empty) {
        const sprintIds = sprintsSnapshot.docs.map(doc => doc.id);
        
        // Delete all private reflections for these sprints
        const deleteReflectionPromises = sprintIds.map(async (sprintId) => {
          const reflectionsQuery = query(
            collection(db, 'privateReflections'),
            where('sprintId', '==', sprintId)
          );
          const reflectionsSnapshot = await getDocs(reflectionsQuery);
          
          if (!reflectionsSnapshot.empty) {
            const deletePromises = reflectionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            // Log(`Deleted ${reflectionsSnapshot.docs.length} private reflections for sprint ${sprintId}`);
          }
        });
        
        await Promise.all(deleteReflectionPromises);
        // Log(`Deleted all private reflections for board ${boardId}`);
      }
    } catch (error) {
      // Error('Error deleting board private reflections:', error);
      throw error;
    }
  }

  // Delete all board access entries
  private async deleteAllBoardAccess(boardId: string): Promise<void> {
    try {
      const boardAccessQuery = query(
        collection(db, 'boardAccess'),
        where('boardId', '==', boardId)
      );
      const accessSnapshot = await getDocs(boardAccessQuery);
      
      if (!accessSnapshot.empty) {
        const deleteAccessPromises = accessSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteAccessPromises);
        // Log(`Deleted ${accessSnapshot.docs.length} board access entries for board ${boardId}`);
      }
    } catch (error) {
      // Error('Error deleting board access entries:', error);
      throw error;
    }
  }

  // Delete all pending board access entries
  private async deleteAllPendingBoardAccess(boardId: string): Promise<void> {
    try {
      const pendingAccessQuery = query(
        collection(db, 'pendingBoardAccess'),
        where('boardId', '==', boardId)
      );
      const pendingSnapshot = await getDocs(pendingAccessQuery);
      
      if (!pendingSnapshot.empty) {
        const deletePendingPromises = pendingSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePendingPromises);
        // Log(`Deleted ${pendingSnapshot.docs.length} pending board access entries for board ${boardId}`);
      }
    } catch (error) {
      // Error('Error deleting pending board access entries:', error);
      throw error;
    }
  }
}

export const boardService = new BoardService();