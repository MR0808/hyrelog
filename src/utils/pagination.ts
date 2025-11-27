interface PaginateArgs<TModel> {
    model: TModel;
    where?: any;
    orderBy?: any;
    cursor?: string | null;
    limit?: number;
}

export async function paginate<T>(
    args: PaginateArgs<{ findMany: (opts: any) => Promise<T[]> }>
) {
    const { model, where, orderBy, cursor, limit = 100 } = args;
    // Enforce safe bounds
    const take = Math.min(Math.max(limit, 1), 500);

    const query: any = { where, orderBy, take };

    if (cursor) {
        query.skip = 1;
        query.cursor = { id: cursor };
    }

    const results = await model.findMany(query);
    let nextCursor: string | null = null;

    if (results.length === take) {
        const last = results[results.length - 1] as any;
        nextCursor = last.id;
    }

    return { data: results, nextCursor };
}
