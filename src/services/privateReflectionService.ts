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
    sprintId: string,
    requestingUserId?: string
  ): Promise<PrivateReflectionData | null> {
    try {
      // If requestingUserId is provided, check if the requesting user has manager/admin access
      if (requestingUserId && requestingUserId !== userId) {
        // First try to get boardAccess document
        const requestingUserAccess = await getDoc(doc(db, 'boardAccess', `${boardId}_${requestingUserId}`));
        let isManagerOrAdmin = false;
        
        if (requestingUserAccess.exists()) {
          const requestingUserData = requestingUserAccess.data();
          isManagerOrAdmin = requestingUserData?.role === 'admin' || requestingUserData?.role === 'manager';
        } else {
          // If no boardAccess document, check if user is the board creator
          const boardDoc = await getDoc(doc(db, 'boards', boardId));
          if (boardDoc.exists()) {
            const boardData = boardDoc.data();
            if (boardData.createdBy.uid === requestingUserId) {
              isManagerOrAdmin = true; // Board creator has admin access
            }
          }
        }
        
        if (isManagerOrAdmin) {
          // Manager/admin can access team member reflections
          const reflectionDoc = await getDoc(
            doc(db, 'privateReflections', `${sprintId}_${userId}`)
          );
          
          if (reflectionDoc.exists()) {
            return reflectionDoc.data() as PrivateReflectionData;
          }
          return null;
        }
      }

      // Check if user has access to this board (for their own reflections)
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        // If no direct access, check if user is the board creator or collaborator
        const boardDoc = await getDoc(doc(db, 'boards', boardId));
        if (!boardDoc.exists()) {
          throw new Error('Board not found');
        }
        const boardData = boardDoc.data();
        
        // Check if user is the board creator
        if (boardData.createdBy.uid === userId || boardData.createdBy.email === userId) {
          // User is the board creator
        } else {
          // Check if user is a collaborator (using email)
          const isCollaborator = boardData.collaborators?.some((collab: any) => collab.email === userId);
          if (!isCollaborator) {
            throw new Error('Access denied to board');
          }
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
      // Error fetching private reflection
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
        // If no direct access, check if user is the board creator or collaborator
        const boardDoc = await getDoc(doc(db, 'boards', boardId));
        if (!boardDoc.exists()) {
          throw new Error('Board not found');
        }
        const boardData = boardDoc.data();
        
        // Check if user is the board creator
        if (boardData.createdBy.uid === userId || boardData.createdBy.email === userId) {
          // User is the board creator
        } else {
          // Check if user is a collaborator (using email)
          const isCollaborator = boardData.collaborators?.some((collab: any) => collab.email === userId);
          if (!isCollaborator) {
            throw new Error('Access denied to board');
          }
        }
      }

      const reflectionId = `${sprintId}_${userId}`;
      const existingDoc = await getDoc(doc(db, 'privateReflections', reflectionId));
      
      // Clean the data to remove undefined values
      const cleanData = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(cleanData);
        
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          if (value !== undefined) {
            cleaned[key] = cleanData(value);
          }
        });
        return cleaned;
      };

      const existingData = existingDoc.exists() ? existingDoc.data() : {};
      const cleanedReflectionData = cleanData(reflectionData);
      
      const privateReflectionData: PrivateReflectionData = {
        sprintId,
        sprintNumber,
        userId,
        userEmail,
        userName,
        personalGrowth: cleanedReflectionData.personalGrowth || {},
        teamInsights: cleanedReflectionData.teamInsights || {},
        lessonsLearned: cleanedReflectionData.lessonsLearned || {},
        futureGoals: cleanedReflectionData.futureGoals || {},
        lastUpdated: new Date().toISOString(),
        isPrivate: true,
        ...cleanData(existingData),
        ...cleanedReflectionData
      };

      await setDoc(doc(db, 'privateReflections', reflectionId), privateReflectionData);
    } catch (error) {
      // Error saving private reflection
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
      // But we need to be careful about access - only show reflections for users who have access to this board
      const reflectionsQuery = query(
        collection(db, 'privateReflections'),
        where('sprintId', '==', sprintId)
      );
      
      const snapshot = await getDocs(reflectionsQuery);
      const reflections = snapshot.docs.map(doc => doc.data() as PrivateReflectionData);
      
      // Filter reflections to only include users who have access to this board
      const validReflections = [];
      for (const reflection of reflections) {
        try {
          // Check if the reflection owner has access to this board
          const userAccessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${reflection.userId}`));
          if (userAccessDoc.exists()) {
            validReflections.push(reflection);
          } else {
            // Check if they're the board creator
            const boardDoc = await getDoc(doc(db, 'boards', boardId));
            if (boardDoc.exists()) {
              const boardData = boardDoc.data();
              if (boardData.createdBy.uid === reflection.userId) {
                validReflections.push(reflection);
              }
            }
          }
        } catch (error) {
          // Skipping reflection due to access check error
        }
      }
      
      return validReflections;
    } catch (error) {
      // Error fetching sprint private reflections
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
