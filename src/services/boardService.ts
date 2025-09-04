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
  // Fetch all boards for a user
  async fetchUserBoards(userId: string): Promise<Board[]> {
    try {
      const boardsQuery = query(
        collection(db, 'users', userId, 'boards'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(boardsQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
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

  // Delete board
  async deleteBoard(userId: string, boardId: string): Promise<void> {
    try {
      // TODO: Also delete all tasks in the board
      await deleteDoc(doc(db, 'users', userId, 'boards', boardId));
    } catch (error) {
      console.error('Error deleting board:', error);
      throw error;
    }
  }
}

export const boardService = new BoardService();