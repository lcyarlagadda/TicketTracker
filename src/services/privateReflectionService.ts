// services/privateReflectionService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Unsubscribe,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { PrivateReflectionData, EnhancedReflectionItem } from '../store/types/types';

class PrivateReflectionService {
  // Get private reflection data for a user and sprint
  async getPrivateReflection(
    userId: string,
    boardId: string,
    sprintId: string
  ): Promise<PrivateReflectionData | null> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        // If no direct access, check if user is the board creator
        const boardDoc = await getDoc(doc(db, 'boards', boardId));
        if (!boardDoc.exists()) {
          throw new Error('Board not found');
        }
        const boardData = boardDoc.data();
        if (boardData.createdBy.uid !== userId) {
          throw new Error('Access denied to board');
        }
      }

      const reflectionDoc = await getDoc(
        doc(db, 'privateReflections', `${sprintId}_${userId}`)
      );
      
      if (reflectionDoc.exists()) {
        return reflectionDoc.data() as PrivateReflectionData;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching private reflection:', error);
      throw error;
    }
  }

  // Create or update private reflection data
  async savePrivateReflection(
    userId: string,
    userEmail: string,
    userName: string,
    boardId: string,
    sprintId: string,
    sprintNumber: number,
    reflectionData: Partial<PrivateReflectionData>
  ): Promise<void> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        // If no direct access, check if user is the board creator
        const boardDoc = await getDoc(doc(db, 'boards', boardId));
        if (!boardDoc.exists()) {
          throw new Error('Board not found');
        }
        const boardData = boardDoc.data();
        if (boardData.createdBy.uid !== userId) {
          throw new Error('Access denied to board');
        }
      }

      const reflectionId = `${sprintId}_${userId}`;
      const existingDoc = await getDoc(doc(db, 'privateReflections', reflectionId));
      
      const privateReflectionData: PrivateReflectionData = {
        sprintId,
        sprintNumber,
        userId,
        userEmail,
        userName,
        personalGrowth: reflectionData.personalGrowth || [],
        teamInsights: reflectionData.teamInsights || [],
        lessonsLearned: reflectionData.lessonsLearned || [],
        futureGoals: reflectionData.futureGoals || [],
        managerFeedback: reflectionData.managerFeedback || [],
        lastUpdated: new Date().toISOString(),
        isPrivate: true,
        ...(existingDoc.exists() ? existingDoc.data() : {}),
        ...reflectionData
      };

      await setDoc(doc(db, 'privateReflections', reflectionId), privateReflectionData);
    } catch (error) {
      console.error('Error saving private reflection:', error);
      throw error;
    }
  }

  // Get all private reflections for a sprint (for managers/admins)
  async getSprintPrivateReflections(
    userId: string,
    boardId: string,
    sprintId: string
  ): Promise<PrivateReflectionData[]> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        // If no direct access, check if user is the board creator
        const boardDoc = await getDoc(doc(db, 'boards', boardId));
        if (!boardDoc.exists()) {
          throw new Error('Board not found');
        }
        const boardData = boardDoc.data();
        if (boardData.createdBy.uid !== userId) {
          throw new Error('Access denied to board');
        }
      }

      // Get user's role to determine if they can see all reflections
      const userAccess = accessDoc.data();
      const isManagerOrAdmin = userAccess?.role === 'admin' || userAccess?.role === 'manager';

      if (!isManagerOrAdmin) {
        // Regular users can only see their own reflections
        const userReflection = await this.getPrivateReflection(userId, boardId, sprintId);
        return userReflection ? [userReflection] : [];
      }

      // Managers and admins can see all reflections for the sprint
      const reflectionsQuery = query(
        collection(db, 'privateReflections'),
        where('sprintId', '==', sprintId)
      );
      
      const snapshot = await getDocs(reflectionsQuery);
      return snapshot.docs.map(doc => doc.data() as PrivateReflectionData);
    } catch (error) {
      console.error('Error fetching sprint private reflections:', error);
      throw error;
    }
  }

  // Add manager feedback to a private reflection
  async addManagerFeedback(
    managerId: string,
    managerEmail: string,
    managerName: string,
    boardId: string,
    sprintId: string,
    targetUserId: string,
    feedback: EnhancedReflectionItem
  ): Promise<void> {
    try {
      // Check if manager has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${managerId}`));
      if (!accessDoc.exists()) {
        throw new Error('Access denied to board');
      }

      const userAccess = accessDoc.data();
      const isManagerOrAdmin = userAccess?.role === 'admin' || userAccess?.role === 'manager';

      if (!isManagerOrAdmin) {
        throw new Error('Only managers and admins can provide feedback');
      }

      const reflectionId = `${sprintId}_${targetUserId}`;
      const reflectionDoc = await getDoc(doc(db, 'privateReflections', reflectionId));
      
      if (!reflectionDoc.exists()) {
        throw new Error('Reflection not found');
      }

      const reflectionData = reflectionDoc.data() as PrivateReflectionData;
      const updatedFeedback = [...(reflectionData.managerFeedback || []), feedback];

      await updateDoc(doc(db, 'privateReflections', reflectionId), {
        managerFeedback: updatedFeedback,
        managerId,
        managerEmail,
        managerName,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding manager feedback:', error);
      throw error;
    }
  }

  // Listen to private reflection changes in real-time
  subscribeToPrivateReflection(
    userId: string,
    boardId: string,
    sprintId: string,
    callback: (reflection: PrivateReflectionData | null) => void
  ): Unsubscribe {
    const reflectionId = `${sprintId}_${userId}`;
    
    return onSnapshot(doc(db, 'privateReflections', reflectionId), (doc) => {
      if (doc.exists()) {
        callback(doc.data() as PrivateReflectionData);
      } else {
        callback(null);
      }
    });
  }
}

export const privateReflectionService = new PrivateReflectionService();
