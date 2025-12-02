# HyreLog FastAPI Example

Example FastAPI application demonstrating HyreLog Python SDK integration.

## Features

- Automatic HTTP request/response logging via middleware
- Custom event logging in routes
- Error tracking
- Async/await support

## Setup

1. Install dependencies:
```bash
pip install fastapi uvicorn hyrelog-python
```

Or with Poetry:
```bash
poetry install
```

2. Set environment variables:
```bash
export HYRELOG_WORKSPACE_KEY=your-workspace-key
export HYRELOG_BASE_URL=http://localhost:4040
```

3. Run the server:
```bash
python main.py
# or
uvicorn main:app --reload
```

## Usage

The example includes:
- FastAPI middleware for automatic logging
- Custom event logging in routes
- Error handling with event tracking
- Pydantic models for type safety

Visit `http://localhost:3000/docs` for the interactive API documentation.

