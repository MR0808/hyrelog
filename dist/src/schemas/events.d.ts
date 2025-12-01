import { z } from "zod";
export declare const actorSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    name: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    id?: string | undefined;
    email?: string | undefined;
}, {
    name?: string | undefined;
    id?: string | undefined;
    email?: string | undefined;
}>;
export declare const targetSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    type: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id?: string | undefined;
    type?: string | undefined;
}, {
    id?: string | undefined;
    type?: string | undefined;
}>;
export declare const ingestEventSchema: z.ZodObject<{
    action: z.ZodString;
    category: z.ZodString;
    actor: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        name: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        id?: string | undefined;
        email?: string | undefined;
    }, {
        name?: string | undefined;
        id?: string | undefined;
        email?: string | undefined;
    }>>;
    target: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        type: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id?: string | undefined;
        type?: string | undefined;
    }, {
        id?: string | undefined;
        type?: string | undefined;
    }>>;
    projectId: z.ZodOptional<z.ZodString>;
    payload: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    action: string;
    category: string;
    payload: Record<string, any>;
    target?: {
        id?: string | undefined;
        type?: string | undefined;
    } | undefined;
    projectId?: string | undefined;
    actor?: {
        name?: string | undefined;
        id?: string | undefined;
        email?: string | undefined;
    } | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    action: string;
    category: string;
    target?: {
        id?: string | undefined;
        type?: string | undefined;
    } | undefined;
    projectId?: string | undefined;
    actor?: {
        name?: string | undefined;
        id?: string | undefined;
        email?: string | undefined;
    } | undefined;
    payload?: Record<string, any> | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export type IngestEventInput = z.infer<typeof ingestEventSchema>;
export declare const eventFilterSchema: z.ZodObject<{
    from: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>, Date | undefined, string | undefined>;
    to: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>, Date | undefined, string | undefined>;
    action: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    actorId: z.ZodOptional<z.ZodString>;
    actorEmail: z.ZodOptional<z.ZodString>;
    workspaceId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    from?: Date | undefined;
    workspaceId?: string | undefined;
    to?: Date | undefined;
    action?: string | undefined;
    category?: string | undefined;
    actorId?: string | undefined;
    actorEmail?: string | undefined;
    projectId?: string | undefined;
}, {
    from?: string | undefined;
    workspaceId?: string | undefined;
    to?: string | undefined;
    action?: string | undefined;
    category?: string | undefined;
    actorId?: string | undefined;
    actorEmail?: string | undefined;
    projectId?: string | undefined;
}>;
export type EventFilterInput = z.infer<typeof eventFilterSchema>;
//# sourceMappingURL=events.d.ts.map