# HyreLog Next.js Example

Example Next.js application demonstrating HyreLog SDK integration.

## Features

- Automatic event logging for API routes
- Server-side event ingestion
- Client-side event tracking
- Schema registry integration
- Real-time event tailing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```env
HYRELOG_WORKSPACE_KEY=your-workspace-key
HYRELOG_BASE_URL=http://localhost:4040
```

3. Run the development server:
```bash
npm run dev
```

## Usage

The example includes:
- API routes with automatic event logging
- Server components with event tracking
- Client components with user action tracking
- Schema validation examples

Visit `http://localhost:3000` to see the example in action.

