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
import { Sprint, Task, Board } from '../store/types/types';
import { hasPermissionLegacy } from '../utils/permissions';

class SprintService {
  // Create a new sprint
  async createSprint(
    userId: string, 
    boardId: string, 
    sprintData: Omit<Sprint, 'id'>,
    board: Board,
    userEmail: string
  ): Promise<Sprint> {
    try {
      // Check if user has permission to manage sprints
      const canManage = hasPermissionLegacy(board, userEmail, 'canManageSprints');
      if (!canManage) {
        throw new Error('Access denied: Only managers and admins can create sprints');
      }

      const sprintId = uuidv4();
      
      const newSprint = {
        ...sprintData,
        boardId,
        createdAt: new Date().toISOString(),
      };

      await setDoc(
        doc(db, 'sprints', sprintId), 
        newSprint
      );

      return { id: sprintId, ...newSprint } as Sprint;
    } catch (error) {
      // Error('Error creating sprint:', error);
      throw error;
    }
  }

  // Fetch all sprints for a board
  async fetchBoardSprints(userId: string, boardId: string): Promise<Sprint[]> {
    try {
      // Fetching sprints for user and board
      
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      // Board access checked
      
      if (!accessDoc.exists()) {
        // If no direct access, check if user is the board creator
        const boardDoc = await getDoc(doc(db, 'boards', boardId));
        if (!boardDoc.exists()) {
          // Board not found
          throw new Error('Board not found');
        }
        const boardData = boardDoc.data();
        // Board creator checked
        if (boardData.createdBy.uid !== userId) {
          // Access denied - not board creator
          throw new Error('Access denied to board');
        }
        // Access granted - user is board creator
      } else {
        // Access granted - user has board access
      }

      const sprintsQuery = query(
        collection(db, 'sprints'),
        where('boardId', '==', boardId)
      );
      const snapshot = await getDocs(sprintsQuery);
      // Found sprints
      
      const sprints = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        boardId, 
        ...doc.data() 
      } as Sprint));
      
      // Sort in memory by sprint number
      return sprints.sort((a, b) => (b.sprintNumber || 0) - (a.sprintNumber || 0));
    } catch (error) {
      // Error('Error fetching sprints:', error);
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
      // Error('Error fetching sprint:', error);
      throw error;
    }
  }

  // Update sprint
  async updateSprint(
    userId: string, 
    boardId: string, 
    sprintId: string, 
    updates: Partial<Sprint>,
    board: Board,
    userEmail: string
  ): Promise<void> {
    try {
      // Check if user has permission to manage sprints
      const canManage = hasPermissionLegacy(board, userEmail, 'canManageSprints');
      if (!canManage) {
        throw new Error('Access denied: Only managers and admins can update sprints');
      }

      const sprintRef = doc(db, 'sprints', sprintId);
      await updateDoc(sprintRef, updates);
    } catch (error) {
      // Error('Error updating sprint:', error);
      throw error;
    }
  }

  // Delete sprint
  async deleteSprint(userId: string, boardId: string, sprintId: string, board: Board, userEmail: string): Promise<void> {
    try {
      // Check if user has permission to manage sprints
      const canManage = hasPermissionLegacy(board, userEmail, 'canManageSprints');
      if (!canManage) {
        throw new Error('Access denied: Only managers and admins can delete sprints');
      }

      // First, unassign all tasks from this sprint
      await this.unassignAllTasksFromSprint(userId, boardId, sprintId);
      
      // Then delete the sprint
      await deleteDoc(doc(db, 'sprints', sprintId));
    } catch (error) {
      // Error('Error deleting sprint:', error);
      throw error;
    }
  }

  // Assign tasks to sprint
  async assignTasksToSprint(
    userId: string,
    boardId: string,
    sprintId: string,
    taskIds: string[],
    board: Board,
    userEmail: string
  ): Promise<void> {
    try {
      // Check if user has permission to manage sprints
      const canManage = hasPermissionLegacy(board, userEmail, 'canManageSprints');
      if (!canManage) {
        throw new Error('Access denied: Only managers and admins can assign tasks to sprints');
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
      // Error('Error assigning tasks to sprint:', error);
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
      // Error('Error unassigning tasks from sprint:', error);
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
      // Error('Error fetching tasks by IDs:', error);
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
      // Error('Error getting next sprint number:', error);
      return 1;
    }
  }

  // Complete active sprint
  async completeActiveSprint(
    userId: string,
    boardId: string,
    sprintId: string,
    board: Board,
    userEmail: string
  ): Promise<Sprint> {
    try {
      // Get current sprint data
      const sprint = await this.fetchSprint(userId, boardId, sprintId);
      
      // Calculate actual velocity and completion metrics
      const tasks = await this.fetchSprintTasks(userId, boardId, sprintId);
      const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'Done');
      const incompleteTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'Done');
      
      // Helper function to get task points
      const getTaskPoints = (task: any): number => {
        if (task.points !== null && task.points !== undefined) {
          return task.points;
        }
        return task.priority === "High" ? 8 : task.priority === "Medium" ? 5 : 3;
      };
      
      // Calculate story points metrics
      const completedStoryPoints = completedTasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
      const spilloverStoryPoints = incompleteTasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
      const initialStoryPoints = sprint.totalStoryPoints || (completedStoryPoints + spilloverStoryPoints);
      
      // Calculate completion rate
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
      
      const updates = {
        status: 'completed' as const,
        actualVelocity: completedStoryPoints,
        completionRate: Math.round(completionRate * 10) / 10, // Round to 1 decimal place
        completedAt: new Date().toISOString(),
        // New completion tracking fields
        initialStoryPoints,
        completedStoryPoints,
        spilloverStoryPoints
      };
      
      await this.updateSprint(userId, boardId, sprintId, updates, board, userEmail);
      return await this.fetchSprint(userId, boardId, sprintId);
    } catch (error) {
      // Error('Error completing sprint:', error);
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
    // Error('Error fetching sprint tasks:', error);
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