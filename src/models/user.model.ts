import { Model, ModelOptions, QueryContext, RelationMappings, RelationMappingsThunk } from "objection";
import bcrypt from "bcrypt";

export interface IActivityLog {
  operation: string;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
}

export class User extends Model {
  id!: number;
  name!: string;
  email!: string;
  password!: string;
  activity_log?: IActivityLog[];
  created_at!: string;
  updated_at!: string;

  static tableName = "users";

  // Automatic JSON serialization/deserialization for PostgreSQL jsonb
  static get jsonAttributes(): string[] {
    return ["activity_log"];
  }

  // --- Lifecycle Hooks ---

  async $beforeInsert(queryContext: QueryContext): Promise<void> {
    await super.$beforeInsert(queryContext);
    
    // Set audit timestamps
    const now = new Date().toISOString();
    this.created_at = now;
    this.updated_at = now;

    // Hash raw password before saving
    if (this.password && !this.isBcryptHash(this.password)) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async $beforeUpdate(opt: ModelOptions, queryContext: QueryContext): Promise<void> {
    await super.$beforeUpdate(opt, queryContext);

    // Refresh update timestamp
    this.updated_at = new Date().toISOString();

    // Re-hash password if updated as cleartext
    if (this.password && !this.isBcryptHash(this.password)) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  // Security Defense: Strip sensitive attributes on API serialization
  $formatJson(json: Record<string, any>): Record<string, any> {
    const formatted = super.$formatJson(json);
    delete formatted.password;
    return formatted;
  }

  // Helper method to verify password hash format
  private isBcryptHash(str: string): boolean {
    return /^\$2[ayb]\$.{56}$/.test(str);
  }

  // Helper instance method for credential validation
  async verifyPassword(plainTextPassword: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, this.password);
  }

  // --- Relations ---

  static get relationMappings(): RelationMappings | RelationMappingsThunk {
    // Deferred import to avoid circular dependency issues
    const { Task } = require("./task.model");

    return {
      tasks: {
        relation: Model.HasManyRelation,
        modelClass: Task,
        join: {
          from: "users.id",
          to: "tasks.user_id",
        },
      },
    };
  }

  // --- JSON Schema Validation ---

  static get jsonSchema() {
    return {
      type: "object",
      required: ["name", "email", "password"],
      additionalProperties: false,
      properties: {
        id: { type: "integer" },
        name: { type: "string", minLength: 1, maxLength: 100 },
        email: { 
          type: "string", 
          format: "email", 
          maxLength: 255 
        },
        password: { type: "string", minLength: 8, maxLength: 255 },
        activity_log: {
          type: "array",
          items: {
            type: "object",
            required: ["operation", "performed_at"],
            additionalProperties: false,
            properties: {
              operation: { type: "string", maxLength: 255 },
              performed_at: { type: "string", format: "date-time" },
              ip_address: { type: ["string", "null"] },
              user_agent: { type: ["string", "null"] },
            },
          },
        },
        created_at: { type: "string", format: "date-time" },
        updated_at: { type: "string", format: "date-time" },
      },
    };
  }
}