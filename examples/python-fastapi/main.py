"""
FastAPI example with HyreLog integration
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from hyrelog import HyreLogWorkspaceClient, EventInput
from pydantic import BaseModel
import os
from typing import Optional

app = FastAPI(title="HyreLog FastAPI Example")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize HyreLog client
client = HyreLogWorkspaceClient(
    workspace_key=os.getenv("HYRELOG_WORKSPACE_KEY", ""),
    base_url=os.getenv("HYRELOG_BASE_URL", "https://api.hyrelog.com"),
    debug=True,
)


class UserCreate(BaseModel):
    name: str
    email: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware to log all requests"""
    import time

    start_time = time.time()

    # Process request
    response = await call_next(request)

    # Calculate duration
    duration_ms = (time.time() - start_time) * 1000

    # Log event
    await client.log_event(
        EventInput(
            action=f"http.{request.method.lower()}",
            category="http",
            payload={
                "method": request.method,
                "path": str(request.url.path),
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
            metadata={
                "user_agent": request.headers.get("user-agent"),
                "ip": request.client.host if request.client else None,
            },
        )
    )

    return response


@app.get("/api/users")
async def get_users(request: Request):
    """Get all users"""
    # Log custom event
    await client.log_event(
        EventInput(
            action="users.list",
            category="api",
            payload={"filter": request.query_params.get("filter")},
        )
    )

    users = [
        {"id": "1", "name": "John Doe", "email": "john@example.com"},
        {"id": "2", "name": "Jane Smith", "email": "jane@example.com"},
    ]

    return {"users": users}


@app.post("/api/users")
async def create_user(user: UserCreate, request: Request):
    """Create a new user"""
    try:
        # Log creation event
        await client.log_event(
            EventInput(
                action="user.created",
                category="api",
                payload={
                    "name": user.name,
                    "email": user.email,
                },
                changes=[
                    {"field": "status", "old": None, "new": "active"},
                ],
            )
        )

        new_user = {
            "id": str(int(time.time())),
            "name": user.name,
            "email": user.email,
            "created_at": time.time(),
        }

        return {"user": new_user}, 201
    except Exception as e:
        # Log error
        await client.log_event(
            EventInput(
                action="user.create.error",
                category="error",
                payload={"error": str(e)},
            )
        )
        raise HTTPException(status_code=500, detail="Failed to create user")


@app.put("/api/users/{user_id}")
async def update_user(user_id: str, user: UserUpdate, request: Request):
    """Update a user"""
    changes = []
    if user.name:
        changes.append({"field": "name", "old": "Old Name", "new": user.name})
    if user.email:
        changes.append({"field": "email", "old": "old@example.com", "new": user.email})

    await client.log_event(
        EventInput(
            action="user.updated",
            category="api",
            payload={"userId": user_id},
            changes=changes,
        )
    )

    return {"success": True}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=3000)

