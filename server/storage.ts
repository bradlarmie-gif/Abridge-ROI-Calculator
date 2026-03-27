import { type User, type InsertUser, type ShortLink, shortLinks } from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, gt, or, isNull, and } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createShortLink(code: string, paramKey: string, payload: string, expiresAt: Date): Promise<ShortLink>;
  getShortLink(code: string): Promise<{ paramKey: string; payload: string } | null>;
}

export class DatabaseStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createShortLink(code: string, paramKey: string, payload: string, expiresAt: Date): Promise<ShortLink> {
    const [row] = await db.insert(shortLinks).values({ code, paramKey, payload, expiresAt }).returning();
    return row;
  }

  async getShortLink(code: string): Promise<{ paramKey: string; payload: string } | null> {
    const [row] = await db
      .select({ paramKey: shortLinks.paramKey, payload: shortLinks.payload })
      .from(shortLinks)
      .where(
        and(
          eq(shortLinks.code, code),
          or(isNull(shortLinks.expiresAt), gt(shortLinks.expiresAt, new Date()))
        )
      )
      .limit(1);
    return row ?? null;
  }
}

export const storage = new DatabaseStorage();
