// services/taskService.ts - Updated with fetchChildTasks method
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Task } from '../store/types/types';

class TaskService {
  // Fetch all tasks for a board
  async fetchBoardTasks(userId: string, boardId: string): Promise<Task[]> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        throw new Error('Access denied to board');
      }

      const tasksQuery = query(
        collection(db, 'tasks'),
        where('boardId', '==', boardId)
      );
      const snapshot = await getDocs(tasksQuery);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        boardId, 
        ...doc.data() 
      } as Task));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  // Fetch child tasks for a parent task
  async fetchChildTasks(userId: string, boardId: string, parentTaskId: string): Promise<Task[]> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        throw new Error('Access denied to board');
      }

      const childTasksQuery = query(
        collection(db, 'tasks'),
        where('boardId', '==', boardId),
        where('parentTaskId', '==', parentTaskId)
      );
      const snapshot = await getDocs(childTasksQuery);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        boardId, 
        ...doc.data() 
      } as Task));
    } catch (error) {
      console.error('Error fetching child tasks:', error);
      throw error;
    }
  }

  // Listen to tasks in real-time
  subscribeToTasks(
    userId: string, 
    boardId: string, 
    callback: (tasks: Task[]) => void
  ): Unsubscribe {
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('boardId', '==', boardId)
    );
    
    return onSnapshot(tasksQuery, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        boardId, 
        ...doc.data() 
      } as Task));
      callback(tasks);
    });
  }

  // Listen to child tasks
  subscribeToChildTasks(
    userId: string,
    boardId: string,
    parentTaskId: string,
    callback: (tasks: Task[]) => void
  ): Unsubscribe {
    const childTasksQuery = query(
      collection(db, 'tasks'),
      where('boardId', '==', boardId),
      where('parentTaskId', '==', parentTaskId)
    );
    
    return onSnapshot(childTasksQuery, (snapshot) => {
      const childTasks = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        boardId, 
        ...doc.data() 
      } as Task));
      callback(childTasks);
    });
  }

  // Create a new task
  async createTask(
    userId: string, 
    boardId: string, 
    taskData: Omit<Task, 'id' | 'boardId'>
  ): Promise<Task> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        throw new Error('Access denied to board');
      }

      const newTask = {
        ...taskData,
        boardId,
        createdAt: serverTimestamp(),
        progressLog: [
          {
            desc: taskData.parentTaskId ? 'Child task created' : 'Task created',
            type: 'created' as const,
            to: taskData.status,
            timestamp: Timestamp.now(),
            user: taskData.createdBy.name,
          },
        ],
      };

      console.log("Creating task with data:", newTask);

      const docRef = await addDoc(
        collection(db, 'tasks'),
        newTask
      );

      return { id: docRef.id, ...newTask } as Task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Update task
  async updateTask(
    userId: string,
    boardId: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<void> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        throw new Error('Access denied to board');
      }

      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, updates);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Delete task
  async deleteTask(userId: string, boardId: string, taskId: string): Promise<void> {
    try {
      // Check if user has access to this board
      const accessDoc = await getDoc(doc(db, 'boardAccess', `${boardId}_${userId}`));
      if (!accessDoc.exists()) {
        throw new Error('Access denied to board');
      }

      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Upload task files
  async uploadTaskFiles(
    userId: string,
    boardId: string,
    taskId: string,
    files: File[]
  ): Promise<{ name: string; url: string }[]> {
    try {
      const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `attachments/${taskId}/${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return { name: file.name, url };
      });
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }
}

export const taskService = new TaskService();