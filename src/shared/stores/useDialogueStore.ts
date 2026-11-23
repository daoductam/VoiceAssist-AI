import { create } from 'zustand';

export type DialogueSlot = 'time' | 'title' | 'label';

export interface SlotFillingSession {
  sessionId: string;
  intent: 'setAlarm' | 'setReminder' | 'addTodo';
  missingSlot: DialogueSlot;
  collectedEntities: Record<string, string>;
  promptQuestion: string;
  createdAt: number;
  expiresAt: number; // TTL = 90.000 ms (90 seconds)
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface DialogueStoreState {
  activeSession: SlotFillingSession | null;
  recentTurns: ChatTurn[];

  startSlotFilling: (params: {
    intent: 'setAlarm' | 'setReminder' | 'addTodo';
    missingSlot: DialogueSlot;
    collectedEntities?: Record<string, string>;
    promptQuestion: string;
  }) => void;

  fillSlot: (slot: DialogueSlot, value: string) => Record<string, string> | null;
  cancelSession: () => void;
  clearExpiredSession: () => boolean;
  addChatTurn: (role: 'user' | 'assistant', content: string) => void;
  clearHistory: () => void;
}

const DEFAULT_TTL_MS = 90_000; // 90 seconds
const MAX_RECENT_TURNS = 6; // 3 user-assistant pairs

export const useDialogueStore = create<DialogueStoreState>((set, get) => ({
  activeSession: null,
  recentTurns: [],

  startSlotFilling: ({
    intent,
    missingSlot,
    collectedEntities = {},
    promptQuestion,
  }) => {
    const now = Date.now();
    const session: SlotFillingSession = {
      sessionId: `dialogue_${now}_${Math.random().toString(36).substring(2, 7)}`,
      intent,
      missingSlot,
      collectedEntities: { ...collectedEntities },
      promptQuestion,
      createdAt: now,
      expiresAt: now + DEFAULT_TTL_MS,
    };
    set({ activeSession: session });
  },

  fillSlot: (slot: DialogueSlot, value: string) => {
    const { activeSession } = get();
    if (!activeSession) return null;

    if (Date.now() > activeSession.expiresAt) {
      set({ activeSession: null });
      return null;
    }

    const updatedEntities = {
      ...activeSession.collectedEntities,
      [slot]: value,
    };

    set({ activeSession: null });
    return updatedEntities;
  },

  cancelSession: () => {
    set({ activeSession: null });
  },

  clearExpiredSession: () => {
    const { activeSession } = get();
    if (activeSession && Date.now() > activeSession.expiresAt) {
      set({ activeSession: null });
      return true;
    }
    return false;
  },

  addChatTurn: (role: 'user' | 'assistant', content: string) => {
    if (!content || !content.trim()) return;
    set((state) => {
      const newTurns = [
        ...state.recentTurns,
        { role, content: content.trim(), timestamp: Date.now() },
      ];
      if (newTurns.length > MAX_RECENT_TURNS) {
        return {
          recentTurns: newTurns.slice(newTurns.length - MAX_RECENT_TURNS),
        };
      }
      return { recentTurns: newTurns };
    });
  },

  clearHistory: () => {
    set({ recentTurns: [], activeSession: null });
  },
}));
