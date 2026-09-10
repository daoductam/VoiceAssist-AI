import { getDatabase } from '../database';
import { ConversationLog } from '@domain/entities';

interface ConversationLogRow {
  id: string;
  user_input: string;
  detected_intent: string;
  entities_json: string | null;
  ai_response: string;
  timestamp: string;
  is_offline: number;
}

function mapRowToLog(row: ConversationLogRow): ConversationLog {
  return {
    id: row.id,
    userInput: row.user_input,
    detectedIntent: row.detected_intent,
    entitiesJson: row.entities_json || undefined,
    aiResponse: row.ai_response,
    timestamp: row.timestamp,
    isOffline: row.is_offline === 1,
  };
}

export class ConversationLogDao {
  async getRecent(limit: number = 30): Promise<ConversationLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ConversationLogRow>(
      'SELECT * FROM conversation_logs ORDER BY timestamp DESC LIMIT ?;',
      [limit]
    );
    return rows.map(mapRowToLog);
  }

  async insert(log: ConversationLog): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO conversation_logs (
        id, user_input, detected_intent, entities_json,
        ai_response, timestamp, is_offline
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        log.id,
        log.userInput,
        log.detectedIntent,
        log.entitiesJson || null,
        log.aiResponse,
        log.timestamp,
        log.isOffline ? 1 : 0,
      ]
    );
  }
}

export const conversationLogDao = new ConversationLogDao();
