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
  orderBy,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '../firebase';
import { Board } from '../store/types/types';

class BoardService {
  // Fetch all boards for a user (owned + shared)
  async fetchUserBoards(userId: string, userEmail?: string): Promise<Board[]> {
    try {
      // Fetch owned boards
      const ownedBoardsQuery = query(
        collection(db, 'users', userId, 'boards'),
        orderBy('createdAt', 'desc')
      );
      const ownedSnapshot = await getDocs(ownedBoardsQuery);
      const ownedBoards = ownedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));

      // Fetch shared boards if user email is provided
      let sharedBoards: Board[] = [];
      if (userEmail) {
        const sharedBoardsQuery = query(
          collection(db, 'sharedBoards'),
          orderBy('sharedAt', 'desc')
        );
        const sharedSnapshot = await getDocs(sharedBoardsQuery);
        
        // Filter shared boards for this user's email
        const userSharedRefs = sharedSnapshot.docs
          .map(doc => doc.data())
          .filter(ref => ref.collaboratorEmail === userEmail);
        
        // Fetch actual board data for shared boards
        const sharedBoardsWithNulls = await Promise.all(
          userSharedRefs.map(async (ref) => {
            try {
              const boardDoc = await getDoc(doc(db, 'users', ref.ownerId, 'boards', ref.boardId));
              if (boardDoc.exists()) {
                return { id: boardDoc.id, ...boardDoc.data() } as Board;
              }
            } catch (error) {
              console.error('Error fetching shared board:', error);
            }
            return null;
          })
        );
        
        // Filter out null values
        sharedBoards = sharedBoardsWithNulls.filter(board => board !== null) as Board[];
      }

      // Combine and deduplicate boards
      const allBoards = [...ownedBoards];
      sharedBoards.forEach(sharedBoard => {
        if (!allBoards.find(board => board.id === sharedBoard.id)) {
          allBoards.push(sharedBoard);
        }
      });

      return allBoards.sort((a, b) => {
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
    const boardsQuery = query(
      collection(db, 'users', userId, 'boards'),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(boardsQuery, (snapshot) => {
      const boards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
      callback(boards);
    });
  }

  // Create a new board
async createBoard(userId: string, boardData: Omit<Board, 'id'>): Promise<Board> {
  try {
    const boardId = uuidv4();
    let imageUrl = '';

    // Handle image upload if present
    if (boardData.imageFile) {
      const imageRef = ref(storage, `boards/${userId}/${boardId}/${boardData.imageFile.name}`);
      await uploadBytes(imageRef, boardData.imageFile);
      imageUrl = await getDownloadURL(imageRef);
    }

    const newBoard = {
      ...boardData,
      imageUrl,
      createdAt: serverTimestamp(),
    };

    delete (newBoard as any).imageFile; // don’t persist File in Firestore

    await setDoc(doc(db, 'users', userId, 'boards', boardId), newBoard);
    return { id: boardId, ...newBoard } as Board;
  } catch (error) {
    console.error('Error creating board:', error);
    throw error;
  }
}


  // Fetch a specific board
  async fetchBoard(userId: string, boardId: string): Promise<Board> {
    try {
      const boardDoc = await getDoc(doc(db, 'users', userId, 'boards', boardId));
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
      const boardRef = doc(db, 'users', userId, 'boards', boardId);
      await updateDoc(boardRef, updates);
    } catch (error) {
      console.error('Error updating board:', error);
      throw error;
    }
  }

  // Share board with collaborator (simplified approach)
  async shareBoardWithCollaborator(ownerId: string, boardId: string, collaboratorEmail: string): Promise<void> {
    try {
      // For now, we'll create a global shared boards collection
      // This allows collaborators to find boards shared with them by email
      await setDoc(doc(db, 'sharedBoards', `${boardId}_${collaboratorEmail.replace(/[^a-zA-Z0-9]/g, '_')}`), {
        boardId,
        ownerId,
        collaboratorEmail,
        sharedAt: serverTimestamp(),
        sharedBy: ownerId
      });
    } catch (error) {
      console.error('Error sharing board:', error);
      throw error;
    }
  }

  // Remove board sharing with collaborator
  async unshareBoardWithCollaborator(collaboratorEmail: string, boardId: string): Promise<void> {
    try {
      // Remove from global shared boards collection
      await deleteDoc(doc(db, 'sharedBoards', `${boardId}_${collaboratorEmail.replace(/[^a-zA-Z0-9]/g, '_')}`));
    } catch (error) {
      console.error('Error unsharing board:', error);
      throw error;
    }
  }

  // Delete board
  async deleteBoard(userId: string, boardId: string): Promise<void> {
    try {
      // Get board data to find collaborators
      const boardDoc = await getDoc(doc(db, 'users', userId, 'boards', boardId));
      if (boardDoc.exists()) {
        const board = boardDoc.data() as Board;
        
        // Remove shared board references for all collaborators
        const unsharePromises = board.collaborators.map(collaborator => 
          this.unshareBoardWithCollaborator(collaborator.email, boardId)
        );
        await Promise.all(unsharePromises);
      }
      
      // Delete the board
      await deleteDoc(doc(db, 'users', userId, 'boards', boardId));
    } catch (error) {
      console.error('Error deleting board:', error);
      throw error;
    }
  }
}

export const boardService = new BoardService();