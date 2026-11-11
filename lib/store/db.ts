import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  ComposedMessage,
  HealthConnection,
  ChatMessage,
  CoachConversation,
  CoachRelationship,
  ProgressSnapshot,
  TrainingPlan,
  UserProfile,
  WorkoutLog,
} from "@/lib/types";

export interface NotrudeSchema extends DBSchema {
  meta: {
    key: string;
    value: UserProfile | TrainingPlan | true;
  };
  logs: {
    key: string;
    value: WorkoutLog;
  };
  chat: {
    key: string;
    value: ChatMessage;
  };
  progress: {
    key: string;
    value: ProgressSnapshot;
  };
  health: {
    key: HealthConnection["provider"];
    value: HealthConnection;
  };
  messages: {
    key: string;
    value: ComposedMessage;
  };
  coachConversations: {
    key: string;
    value: CoachConversation;
  };
  coachRelationships: {
    key: CoachRelationship["coachId"];
    value: CoachRelationship;
  };
}

const DB_NAME = "notrude";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<NotrudeSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<NotrudeSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<NotrudeSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
        if (!db.objectStoreNames.contains("logs")) {
          db.createObjectStore("logs", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("chat")) {
          db.createObjectStore("chat", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("progress")) {
          db.createObjectStore("progress", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("health")) {
          db.createObjectStore("health", { keyPath: "provider" });
        }
        if (!db.objectStoreNames.contains("messages")) {
          db.createObjectStore("messages", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("coachConversations")) {
          db.createObjectStore("coachConversations", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("coachRelationships")) {
          db.createObjectStore("coachRelationships", { keyPath: "coachId" });
        }
      },
    });
  }
  return dbPromise;
}

const STORE_NAMES = [
  "meta",
  "logs",
  "chat",
  "progress",
  "health",
  "messages",
  "coachConversations",
  "coachRelationships",
] as const;

export async function clearAll(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAMES, "readwrite");
  await Promise.all(STORE_NAMES.map((name) => tx.objectStore(name).clear()));
  await tx.done;
}
