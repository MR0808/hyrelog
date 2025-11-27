// src/sdk/error.ts

export class HyreLogError extends Error {
    status: number;
    code?: string;
    body?: any;

    constructor(message: string, status: number, code?: string, body?: any) {
        super(message);
        this.status = status;
        this.code = code;
        this.body = body;
    }
}
