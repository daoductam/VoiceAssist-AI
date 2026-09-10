import { Todo } from '@domain/entities';
import { todoDao } from '@data/daos/todo_dao';
import { ValidationException } from '@core/exceptions/app_exception';

export class TodoService {
  async getAll(): Promise<Todo[]> {
    return todoDao.getAll();
  }

  async create(params: {
    title: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<Todo> {
    if (!params.title || params.title.trim().length === 0) {
      throw new ValidationException('Nội dung công việc không được để trống.');
    }

    const nowIso = new Date().toISOString();
    const newTodo: Todo = {
      id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: params.title.trim(),
      isDone: false,
      dueDate: params.dueDate,
      priority: params.priority || 'medium',
      createdAt: nowIso,
      updatedAt: nowIso,
      syncStatus: 'pending',
    };

    await todoDao.insert(newTodo);
    return newTodo;
  }

  async toggle(id: string, isDone: boolean): Promise<void> {
    await todoDao.toggleDone(id, isDone);
  }

  async delete(id: string): Promise<void> {
    await todoDao.delete(id);
  }
}

export const todoService = new TodoService();
