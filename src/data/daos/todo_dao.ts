import { getDatabase } from '../database';
import { Todo } from '@domain/entities';

interface TodoRow {
  id: string;
  title: string;
  is_done: number;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'failed';
}

function mapRowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    isDone: row.is_done === 1,
    dueDate: row.due_date || undefined,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

export class TodoDao {
  async getAll(): Promise<Todo[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TodoRow>(
      'SELECT * FROM todos ORDER BY is_done ASC, created_at DESC;'
    );
    return rows.map(mapRowToTodo);
  }

  async insert(todo: Todo): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO todos (
        id, title, is_done, due_date, priority, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        todo.id,
        todo.title,
        todo.isDone ? 1 : 0,
        todo.dueDate || null,
        todo.priority,
        todo.createdAt,
        todo.updatedAt,
        todo.syncStatus,
      ]
    );
  }

  async toggleDone(id: string, isDone: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE todos SET is_done = ?, updated_at = ? WHERE id = ?;',
      [isDone ? 1 : 0, new Date().toISOString(), id]
    );
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM todos WHERE id = ?;', [id]);
  }
}

export const todoDao = new TodoDao();
