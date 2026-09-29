import { Todo } from '@domain/entities';
import { todoDao } from '@data/daos/todo_dao';
import { NotFoundException, ValidationException } from '@core/exceptions/app_exception';
import { APP_CONSTANTS } from '@core/constants';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
   .replace(/\b(cong viec|viec|task|todo)\b/g, ' ').replace(/\s+/g, ' ').trim();

export class TodoService {
  private validateTitle(raw: string): string {
    const title = (raw ?? '').trim().replace(/\s+/g, ' ');
    if (!title) throw new ValidationException('Nội dung công việc không được để trống.');
    if (title.length > APP_CONSTANTS.MAX_TODO_LENGTH) {
      throw new ValidationException(
        `Nội dung quá dài (${title.length}/${APP_CONSTANTS.MAX_TODO_LENGTH} ký tự). Bạn rút gọn giúp mình nhé.`
      );
    }
    return title;
  }
  async getAll(): Promise<Todo[]> {
    return todoDao.getAll();
  }

  async findByTitle(title: string): Promise<Todo[]> {
    const normalizedTitle = normalize(this.validateTitle(title));
    return (await todoDao.getAll()).filter(
      (todo) => normalize(todo.title) === normalizedTitle
    );
  }

  async updateTitle(id: string, rawTitle: string): Promise<Todo> {
    const title = this.validateTitle(rawTitle);
    const todos = await todoDao.getAll();
    const existing = todos.find((todo) => todo.id === id);
    if (!existing) throw new NotFoundException('Công việc', id);

    const normalizedTitle = normalize(title);
    if (todos.some((todo) =>
      todo.id !== id && !todo.isDone && normalize(todo.title) === normalizedTitle
    )) {
      throw new ValidationException(`Công việc "${title}" đã có trong danh sách.`);
    }

    const updatedAt = new Date().toISOString();
    await todoDao.updateTitle(id, title, updatedAt);
    return { ...existing, title, updatedAt, syncStatus: 'pending' };
  }

  async create(params: { title: string; dueDate?: string; priority?: 'low'|'medium'|'high' }) {
    const title = this.validateTitle(params.title);
    const normalizedTitle = normalize(title);
    const existing = await todoDao.getAll();
    if (existing.some(t => !t.isDone && normalize(t.title) === normalizedTitle)) {
      throw new ValidationException(`Công việc "${title}" đã có trong danh sách.`);
    }

    const nowIso = new Date().toISOString();
    const newTodo: Todo = {
      id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
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
