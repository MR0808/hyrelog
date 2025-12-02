# HyreLog Example Applications

Example applications demonstrating HyreLog SDK integration across different frameworks and languages.

## Available Examples

### 1. Next.js (`examples/nextjs/`)

Full-featured Next.js application with:
- Automatic request/response logging via middleware
- API routes with event tracking
- Server and client components
- Schema validation examples

**Setup:**
```bash
cd examples/nextjs
npm install
cp .env.example .env.local  # Add your workspace key
npm run dev
```

### 2. Express.js (`examples/node-express/`)

Express.js application with:
- HyreLog middleware for automatic logging
- Custom event logging in routes
- Error tracking
- Rate limit simulation

**Setup:**
```bash
cd examples/node-express
npm install
cp .env.example .env  # Add your workspace key
npm run dev
```

### 3. FastAPI (`examples/python-fastapi/`)

Python FastAPI application with:
- Async/await support
- Automatic HTTP logging middleware
- Custom event logging
- Pydantic models for type safety

**Setup:**
```bash
cd examples/python-fastapi
pip install -r requirements.txt
export HYRELOG_WORKSPACE_KEY=your-key
python main.py
```

## Common Features

All examples demonstrate:
- ✅ Automatic HTTP request/response logging
- ✅ Custom event logging
- ✅ Error tracking
- ✅ Actor extraction from request context
- ✅ OpenTelemetry integration
- ✅ Rate limit handling

## Next Steps

1. Choose an example that matches your stack
2. Copy the example to your project
3. Install the SDK: `npm install @hyrelog/node` or `pip install hyrelog-python`
4. Add your workspace key to environment variables
5. Start logging events!

## Integration Patterns

### Automatic Logging

All examples use middleware/plugins to automatically log:
- HTTP requests and responses
- Errors and exceptions
- Slow requests (configurable threshold)

### Custom Events

Log custom business events:

```typescript
// Node.js
await client.logEvent({
  action: "user.created",
  category: "api",
  actor: { id: userId, email: userEmail },
  payload: { userId, name, email },
});

// Python
await client.log_event(
    EventInput(
        action="user.created",
        category="api",
        actor=Actor(id=user_id, email=user_email),
        payload={"userId": user_id, "name": name},
    )
)
```

### Schema Validation

Use the Schema Registry to validate events:

```bash
# Push schema
hyrelog schema push schema.json

# Events are automatically validated against schemas
```

## License

MIT

