import { z } from 'zod';
export declare const actorSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    name: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const targetSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    type: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const changeSchema: z.ZodObject<{
    field: z.ZodString;
    old: z.ZodOptional<z.ZodAny>;
    new: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
export declare const ingestEventSchema: z.ZodObject<{
    action: z.ZodString;
    category: z.ZodString;
    actor: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        name: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>>;
    target: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        type: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>>;
    projectId: z.ZodOptional<z.ZodString>;
    payload: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    changes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        old: z.ZodOptional<z.ZodAny>;
        new: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type IngestEventInput = z.infer<typeof ingestEventSchema>;
export declare const eventFilterSchema: z.ZodObject<{
    from: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<Date | undefined, string | undefined>>;
    to: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<Date | undefined, string | undefined>>;
    action: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    actorId: z.ZodOptional<z.ZodString>;
    actorEmail: z.ZodOptional<z.ZodString>;
    workspaceId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type EventFilterInput = z.infer<typeof eventFilterSchema>;
//# sourceMappingURL=events.d.ts.map