// services/sprintService.ts
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
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import { Sprint, Task } from '../store/types/types';
import { hasPermission } from '../utils/permissions';

class SprintService {
  // Create a new sprint
  async createSprint(
    userId: string, 
    boardId: string, 
    sprintData: Omit<Sprint, 'id'>
  ): Promise<Sprint> {
    try {
      // Check if user has permission to manage sprints
      const canManage = await hasPermission(boardId, userId, 'canManageSprints');
      if (!canManage) {
        throw new Error('Access denied: Only managers and admins can create sprints');
      }

      const sprintId = uuidv4();
      
      const newSprint = {
        ...sprintData,
        boardId,
        createdAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, 'sprints', sprintId), 
        newSprint
      );

      return { id: sprintId, ...newSprint } as Sprint;
    } catch (error) {
      console.error('Error creating sprint:', error);
      throw error;
    }
  }

  // Fetch all sprints for a board
  async fetchBoardSprints(userId: string, boardId: string): Promise<Sprint[]> {
    try {
      console.log(`Fetching sprints for user ${userId} and board ${boardId}`);
      
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      console.log(`Board access exists: ${accessDoc.exists()}`);
      
      if (!accessDoc.exists()) {
        // If no direct access, check if user is the board creator
        const boardDoc = await getDoc(doc(db, 'boards', boardId));
        if (!boardDoc.exists()) {
          console.log('Board not found');
          throw new Error('Board not found');
        }
        const boardData = boardDoc.data();
        console.log(`Board creator: ${boardData.createdBy.uid}, Current user: ${userId}`);
        if (boardData.createdBy.uid !== userId) {
          console.log('Access denied - not board creator');
          throw new Error('Access denied to board');
        }
        console.log('Access granted - user is board creator');
      } else {
        console.log('Access granted - user has board access');
      }

      const sprintsQuery = query(
        collection(db, 'sprints'),
        where('boardId', '==', boardId)
      );
      const snapshot = await getDocs(sprintsQuery);
      console.log(`Found ${snapshot.docs.length} sprints`);
      
      const sprints = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        boardId, 
        ...doc.data() 
      } as Sprint));
      
      // Sort in memory by sprint number
      return sprints.sort((a, b) => (b.sprintNumber || 0) - (a.sprintNumber || 0));
    } catch (error) {
      console.error('Error fetching sprints:', error);
      throw error;
    }
  }

  // Fetch a specific sprint
  async fetchSprint(userId: string, boardId: string, sprintId: string): Promise<Sprint> {
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

      const sprintDoc = await getDoc(
        doc(db, 'sprints', sprintId)
      );
      if (!sprintDoc.exists()) {
        throw new Error('Sprint not found');
      }
      return { id: sprintDoc.id, boardId, ...sprintDoc.data() } as Sprint;
    } catch (error) {
      console.error('Error fetching sprint:', error);
      throw error;
    }
  }

  // Update sprint
  async updateSprint(
    userId: string,
    boardId: string,
    sprintId: string,
    updates: Partial<Sprint>
  ): Promise<void> {
    try {
      // Check if user has permission to manage sprints
      const canManage = await hasPermission(boardId, userId, 'canManageSprints');
      if (!canManage) {
        throw new Error('Access denied: Only managers and admins can update sprints');
      }

      const sprintRef = doc(db, 'sprints', sprintId);
      await updateDoc(sprintRef, updates);
    } catch (error) {
      console.error('Error updating sprint:', error);
      throw error;
    }
  }

  // Delete sprint
  async deleteSprint(userId: string, boardId: string, sprintId: string): Promise<void> {
    try {
      // Check if user has permission to manage sprints
      const canManage = await hasPermission(boardId, userId, 'canManageSprints');
      if (!canManage) {
        throw new Error('Access denied: Only managers and admins can delete sprints');
      }

      // First, unassign all tasks from this sprint
      await this.unassignAllTasksFromSprint(userId, boardId, sprintId);
      
      // Then delete the sprint
      await deleteDoc(doc(db, 'sprints', sprintId));
    } catch (error) {
      console.error('Error deleting sprint:', error);
      throw error;
    }
  }

  // Assign tasks to sprint
  async assignTasksToSprint(
    userId: string,
    boardId: string,
    sprintId: string,
    taskIds: string[]
  ): Promise<void> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        throw new Error('Access denied to board');
      }

      const batch = writeBatch(db);
      
      // Update each task with the sprint ID
      for (const taskId of taskIds) {
        const taskRef = doc(db, 'tasks', taskId);
        batch.update(taskRef, { sprintId });
      }
      
      // Update sprint with task IDs only (no static story points)
      const sprintRef = doc(db, 'sprints', sprintId);
      
      batch.update(sprintRef, { 
        taskIds
        // Removed totalStoryPoints - will be calculated in real-time
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error assigning tasks to sprint:', error);
      throw error;
    }
  }

  // Unassign all tasks from sprint
  private async unassignAllTasksFromSprint(
    userId: string,
    boardId: string,
    sprintId: string
  ): Promise<void> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        throw new Error('Access denied to board');
      }

      // Fetch tasks assigned to this sprint
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('boardId', '==', boardId),
        where('sprintId', '==', sprintId)
      );
      const snapshot = await getDocs(tasksQuery);
      
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { sprintId: null });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error('Error unassigning tasks from sprint:', error);
      throw error;
    }
  }

  // Helper: Fetch tasks by IDs
  private async fetchTasksByIds(
    userId: string,
    boardId: string,
    taskIds: string[]
  ): Promise<Task[]> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        throw new Error('Access denied to board');
      }

      const tasks = [];
      for (const taskId of taskIds) {
        const taskDoc = await getDoc(
          doc(db, 'tasks', taskId)
        );
        if (taskDoc.exists()) {
          tasks.push({ id: taskDoc.id, boardId, ...taskDoc.data() } as Task);
        }
      }
      return tasks;
    } catch (error) {
      console.error('Error fetching tasks by IDs:', error);
      throw error;
    }
  }

  // Get next sprint number for a board
  async getNextSprintNumber(userId: string, boardId: string): Promise<number> {
    try {
      const sprints = await this.fetchBoardSprints(userId, boardId);
      if (sprints.length === 0) return 1;
      
      const maxSprintNumber = Math.max(...sprints.map(s => s.sprintNumber || 0));
      return maxSprintNumber + 1;
    } catch (error) {
      console.error('Error getting next sprint number:', error);
      return 1;
    }
  }

  // Complete active sprint
  async completeActiveSprint(
    userId: string,
    boardId: string,
    sprintId: string
  ): Promise<Sprint> {
    try {
      // Calculate actual velocity
      const tasks = await this.fetchSprintTasks(userId, boardId, sprintId);
      const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'Done');
      const actualVelocity = completedTasks.reduce((sum, task) => sum + (task.points !== null && task.points !== undefined ? task.points : 0), 0);
      
      // Calculate completion rate
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
      
      const updates = {
        status: 'completed' as const,
        actualVelocity,
        completionRate: Math.round(completionRate * 10) / 10, // Round to 1 decimal place
        completedAt: new Date().toISOString() // Use ISO string instead of serverTimestamp()
      };
      
      await this.updateSprint(userId, boardId, sprintId, updates);
      return await this.fetchSprint(userId, boardId, sprintId);
    } catch (error) {
      console.error('Error completing sprint:', error);
      throw error;
    }
  }


  // Fetch tasks for a specific sprint
async fetchSprintTasks(userId: string, boardId: string, sprintId: string): Promise<Task[]> {
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

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('boardId', '==', boardId),
      where('sprintId', '==', sprintId)
    );
    const snapshot = await getDocs(tasksQuery);
    const tasks = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      boardId, 
      ...doc.data() 
    } as Task));
    
    // Sort in memory instead
    return tasks.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return aDate - bDate;
    });
  } catch (error) {
    console.error('Error fetching sprint tasks:', error);
    throw error;
  }
}

  // Listen to sprints in real-time
  subscribeToSprints(
    userId: string,
    boardId: string,
    callback: (sprints: Sprint[]) => void
  ): Unsubscribe {
    const sprintsQuery = query(
      collection(db, 'sprints'),
      where('boardId', '==', boardId)
    );
    
    return onSnapshot(sprintsQuery, (snapshot) => {
      const sprints = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        boardId, 
        ...doc.data() 
      } as Sprint));
      // Sort in memory
      const sortedSprints = sprints.sort((a, b) => (b.sprintNumber || 0) - (a.sprintNumber || 0));
      callback(sortedSprints);
    });
  }


  // Calculate sprint capacity
  calculateSprintCapacity(
    duration: number,
    workHoursPerWeek: number,
    teamSize: number,
    holidays: string[],
    startDate: string,
    endDate: string
  ): { estimatedCapacity: number; finalizedCapacity: number; capacityUtilization: number } {
    const workingDaysPerWeek = 5; // Assuming 5 working days per week
    const totalWorkingDays = (duration / 7) * workingDaysPerWeek;
    
    // Calculate holidays falling within sprint period
    const sprintStart = new Date(startDate);
    const sprintEnd = new Date(endDate);
    const holidaysInSprint = holidays.filter(holiday => {
      const holidayDate = new Date(holiday);
      return holidayDate >= sprintStart && holidayDate <= sprintEnd;
    }).length;
    
    const estimatedCapacity = (duration / 7) * workHoursPerWeek * teamSize;
    const holidayHours = (holidaysInSprint / totalWorkingDays) * estimatedCapacity;
    const finalizedCapacity = estimatedCapacity - holidayHours;
    
    return {
      estimatedCapacity,
      finalizedCapacity,
      capacityUtilization: 0 // Will be calculated based on assigned tasks
    };
  }
}

export const sprintService = new SprintService();