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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '../firebase';
import { Board, BoardRole, Collaborator } from '../store/types/types';

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
      const boardIds = accessSnapshot.docs.map(doc => doc.data().boardId);

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
            console.error('Error fetching board:', error);
          }
          return null;
        })
      );

      // Filter out null values and sort by creation date
      const boards = boardsWithNulls.filter(board => board !== null) as Board[];
      return boards.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return bTime.getTime() - aTime.getTime();
      });
    } catch (error) {
      console.error('Error fetching boards:', error);
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
      const boardIds = accessSnapshot.docs.map(doc => doc.data().boardId);
      
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
            console.error('Error fetching board:', error);
          }
          return null;
        })
      );

      // Filter out null values and sort by creation date
      const boards = boardsWithNulls.filter(board => board !== null) as Board[];
      const sortedBoards = boards.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
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
        createdAt: serverTimestamp(),
      };

      delete (newBoard as any).imageFile; // don't persist File in Firestore

      // Create board in global boards collection
      await setDoc(doc(db, 'boards', boardId), newBoard);

      // Grant admin access to the creator
      console.log(`Creating board access for creator: ${boardId}_${userId}`);
      await setDoc(doc(db, 'boardAccess', `${boardId}_${userId}`), {
        boardId,
        userId,
        role: 'admin' as BoardRole,
        grantedAt: serverTimestamp(),
        grantedBy: userId
      });
      console.log('Board access created successfully');

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
      console.error('Error creating board:', error);
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
      console.error('Error fetching board:', error);
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
      console.error('Error updating board:', error);
      throw error;
    }
  }

  // Share board with collaborator
  async shareBoardWithCollaborator(ownerId: string, boardId: string, collaboratorEmail: string, role: BoardRole = 'user'): Promise<void> {
    try {
      // First, we need to get the collaborator's userId from their email
      // This would typically require a user lookup service or storing user emails in a users collection
      // For now, we'll create a placeholder that can be updated when the user system is enhanced
      
      // Create a temporary access entry that can be claimed by the user when they sign up
      await setDoc(doc(db, 'pendingBoardAccess', `${boardId}_${collaboratorEmail.replace(/[^a-zA-Z0-9]/g, '_')}`), {
        boardId,
        collaboratorEmail,
        role,
        sharedAt: serverTimestamp(),
        sharedBy: ownerId
      });
    } catch (error) {
      console.error('Error sharing board:', error);
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
      console.error('Error granting board access:', error);
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
        
        console.log(`Granted access to board ${boardId} for user ${userId}`);
      });
      
      await Promise.all(grantPromises);
    } catch (error) {
      console.error('Error granting pending access:', error);
      throw error;
    }
  }

  // Remove board access from collaborator
  async removeBoardAccess(userId: string, boardId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
    } catch (error) {
      console.error('Error removing board access:', error);
      throw error;
    }
  }

  // Unshare board with collaborator (remove from pending access)
  async unshareBoardWithCollaborator(collaboratorEmail: string, boardId: string): Promise<void> {
    try {
      // Remove from pending access
      await deleteDoc(doc(db, 'pendingBoardAccess', `${boardId}_${collaboratorEmail.replace(/[^a-zA-Z0-9]/g, '_')}`));
    } catch (error) {
      console.error('Error unsharing board:', error);
      throw error;
    }
  }

  // Delete board
  async deleteBoard(userId: string, boardId: string): Promise<void> {
    try {
      // Check if user has admin access to delete the board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists() || accessDoc.data().role !== 'admin') {
        throw new Error('Access denied: Only board admins can delete boards');
      }

      // Get all users with access to this board
      const boardAccessQuery = query(
        collection(db, 'boardAccess'),
        where('boardId', '==', boardId)
      );
      const accessSnapshot = await getDocs(boardAccessQuery);
      
      // Remove all board access entries
      const deleteAccessPromises = accessSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteAccessPromises);
      
      // Delete the board
      await deleteDoc(doc(db, 'boards', boardId));
    } catch (error) {
      console.error('Error deleting board:', error);
      throw error;
    }
  }
}

export const boardService = new BoardService();