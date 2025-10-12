import { readFileSync, writeFileSync, existsSync } from 'fs';
import { User } from '../types';
import bcrypt from 'bcrypt';

export class UserManager {
  private usersFile: string;
  private users: Map<string, User>;

  constructor(usersFile: string) {
    this.usersFile = usersFile;
    this.users = new Map();
    this.loadUsers();
  }

  private loadUsers(): void {
    if (!existsSync(this.usersFile)) {
      // Create default admin user
      const defaultUser: User = {
        id: 'user_1',
        username: 'admin',
        password: bcrypt.hashSync('admin', 10)
      };
      this.users.set(defaultUser.username, defaultUser);
      this.saveUsers();
      console.log('⚠️  FIRST RUN: Created default user: admin / admin');
      console.log('⚠️  IMPORTANT: Change this password immediately via Settings!');
      console.log(`⚠️  Users file created at: ${this.usersFile}`);
      return;
    }

    try {
      const data = readFileSync(this.usersFile, 'utf-8');
      const usersArray: User[] = JSON.parse(data);
      console.log(`✅ Loaded ${usersArray.length} user(s) from ${this.usersFile}`);
      usersArray.forEach(user => {
        this.users.set(user.username, user);
      });
    } catch (error) {
      console.error('❌ Error loading users file:', error);
      throw error;
    }
  }

  private saveUsers(): void {
    const usersArray = Array.from(this.users.values());
    writeFileSync(this.usersFile, JSON.stringify(usersArray, null, 2));
  }

  authenticate(username: string, password: string): User | null {
    const user = this.users.get(username);
    if (!user) return null;

    const isValid = bcrypt.compareSync(password, user.password);
    return isValid ? user : null;
  }

  getUserById(id: string): User | null {
    for (const user of this.users.values()) {
      if (user.id === id) return user;
    }
    return null;
  }

  createUser(username: string, password: string): User {
    if (this.users.has(username)) {
      throw new Error('User already exists');
    }

    const user: User = {
      id: `user_${Date.now()}`,
      username,
      password: bcrypt.hashSync(password, 10)
    };

    this.users.set(username, user);
    this.saveUsers();
    return user;
  }

  updatePassword(username: string, newPassword: string): boolean {
    const user = this.users.get(username);
    if (!user) return false;

    user.password = bcrypt.hashSync(newPassword, 10);
    this.saveUsers();
    return true;
  }
}

