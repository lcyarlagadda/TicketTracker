// hooks/useFirebaseSync.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { fetchBoards } from '../store/slices/boardSlice';
import { fetchTasks, setTasks } from '../store/slices/taskSlice';
import { boardService } from '../services/boardService';
import { taskService } from '../services/taskService';

// Custom hook for syncing boards with Firebase
export const useBoardsSync = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { boards } = useAppSelector(state => state.boards);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    dispatch(fetchBoards(user.uid));

    // Real-time subscription
    const unsubscribe = boardService.subscribeToBoards(user.uid, (boards) => {
      // Only update if different from current state to prevent unnecessary re-renders
      dispatch(fetchBoards.fulfilled(boards, '', user.uid));
    });

    return () => unsubscribe();
  }, [user, dispatch]);

  return boards;
};

// Custom hook for syncing tasks with Firebase
export const useTasksSync = (boardId: string) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { tasks } = useAppSelector(state => state.tasks);

  useEffect(() => {
    if (!user || !boardId) return;

    // Initial fetch
    dispatch(fetchTasks({ userId: user.uid, boardId }));

    // Real-time subscription
    const unsubscribe = taskService.subscribeToTasks(user.uid, boardId, (tasks) => {
      dispatch(setTasks(tasks));
    });

    return () => unsubscribe();
  }, [user, boardId, dispatch]);

  return tasks;
};