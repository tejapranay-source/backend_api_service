import { Model, ModelOptions, QueryContext } from "objection";

export interface IActivityLog {
  operation: string;
  performed_at: string;
}

export class User extends Model {
  id!: number;
  name!: string;
  email!: string;
  password!: string;
  activity_log?: IActivityLog[];

  static tableName = "users";

  static get jsonAttributes() {
    return ["activity_log"];
  }

  async $beforeInsert(queryContext: QueryContext): Promise<void> {
    await super.$beforeInsert(queryContext);
  }

  async $beforeUpdate(opt: ModelOptions, queryContext: QueryContext): Promise<void> {
    await super.$beforeUpdate(opt, queryContext);
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["name", "email", "password"],
      additionalProperties: false,
      properties: {
        id: { type: "integer" },
        name: { type: "string", minLength: 1 },
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 6 },
        activity_log: {
          type: "array",
          items: {
            type: "object",
            required: ["operation", "performed_at"],
            additionalProperties: false,
            properties: {
              operation: { type: "string" },
              performed_at: { type: "string" }
            }
          }
        }
      }
    };
  }
}