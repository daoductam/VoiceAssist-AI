import { create } from 'zustand';
import { Todo } from '@domain/entities';
import { todoService } from '@domain/services/todo_service';

interface TodoStoreState {
  todos: Todo[];
  loading: boolean;
  error: string | null;

  loadTodos: () => Promise<void>;
  createTodo: (params: {
    title: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
  }) => Promise<Todo>;
  toggleTodo: (id: string, isDone: boolean) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoStoreState>((set, get) => ({
  todos: [],
  loading: false,
  error: null,

  loadTodos: async () => {
    set({ loading: true, error: null });
    try {
      const todos = await todoService.getAll();
      set({ todos, loading: false });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tải công việc';
      set({ error: errorMsg, loading: false });
    }
  },

  createTodo: async (params) => {
    set({ loading: true, error: null });
    try {
      const newTodo = await todoService.create(params);
      set((state) => ({
        todos: [newTodo, ...state.todos],
        loading: false,
      }));
      return newTodo;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tạo công việc';
      set({ error: errorMsg, loading: false });
      throw err;
    }
  },

  toggleTodo: async (id: string, isDone: boolean) => {
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, isDone } : t)),
    }));
    try {
      await todoService.toggle(id, isDone);
    } catch (err: unknown) {
      get().loadTodos();
      throw err;
    }
  },

  deleteTodo: async (id: string) => {
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
    }));
    try {
      await todoService.delete(id);
    } catch (err: unknown) {
      get().loadTodos();
      throw err;
    }
  },
}));
