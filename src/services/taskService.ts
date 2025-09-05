// services/taskService.ts - Updated with fetchChildTasks method
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
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
      const tasksQuery = query(
        collection(db, 'users', userId, 'boards', boardId, 'tasks'),
        orderBy('createdAt', 'asc')
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
      const childTasksQuery = query(
        collection(db, 'users', userId, 'boards', boardId, 'tasks'),
        where('parentTaskId', '==', parentTaskId),
        orderBy('createdAt', 'asc')
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
      collection(db, 'users', userId, 'boards', boardId, 'tasks'),
      orderBy('createdAt', 'asc')
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
      collection(db, 'users', userId, 'boards', boardId, 'tasks'),
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
      const newTask = {
        ...taskData,
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
        collection(db, 'users', userId, 'boards', boardId, 'tasks'),
        newTask
      );

      return { id: docRef.id, boardId, ...newTask } as Task;
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
      const taskRef = doc(db, 'users', userId, 'boards', boardId, 'tasks', taskId);
      await updateDoc(taskRef, updates);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Delete task
  async deleteTask(userId: string, boardId: string, taskId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', userId, 'boards', boardId, 'tasks', taskId));
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