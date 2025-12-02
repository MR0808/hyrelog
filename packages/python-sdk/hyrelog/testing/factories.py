"""
Event factories for generating test events
"""

from typing import Optional, Dict, Any, List
from hyrelog.types import EventInput, Actor, Target, Change


def create_event_factory(
    defaults: Optional[Dict[str, Any]] = None,
) -> callable:
    """Creates a factory function for generating events"""

    def factory(overrides: Optional[Dict[str, Any]] = None) -> EventInput:
        overrides = overrides or {}
        defaults_dict = defaults or {}

        action = overrides.get("action") or defaults_dict.get("action") or "test.action"
        category = overrides.get("category") or defaults_dict.get("category") or "test"

        actor_id = overrides.get("actor_id") or defaults_dict.get("actor_id")
        actor_email = overrides.get("actor_email") or defaults_dict.get("actor_email")
        actor_name = overrides.get("actor_name") or defaults_dict.get("actor_name")

        actor = None
        if actor_id or actor_email:
            actor = Actor(
                id=actor_id or f"user-{hash(str(actor_email)) % 10000}",
                email=actor_email or f"user-{hash(str(actor_id)) % 10000}@example.com",
                name=actor_name or "Test User",
            )

        target_id = overrides.get("target_id") or defaults_dict.get("target_id")
        target = None
        if target_id:
            target = Target(
                id=target_id,
                type=overrides.get("target_type") or defaults_dict.get("target_type") or "resource",
            )

        payload = {**(defaults_dict.get("payload") or {}), **(overrides.get("payload") or {})}
        metadata = {
            **(defaults_dict.get("metadata") or {}),
            **(overrides.get("metadata") or {}),
            "_test": True,
            "_generated_at": "2024-01-01T00:00:00Z",
        }

        return EventInput(
            action=action,
            category=category,
            actor=actor,
            target=target,
            payload=payload if payload else None,
            metadata=metadata if metadata else None,
            project_id=overrides.get("project_id") or defaults_dict.get("project_id"),
        )

    return factory


class EventFactories:
    """Pre-configured event factories"""

    @staticmethod
    def user_created(overrides: Optional[Dict[str, Any]] = None) -> EventInput:
        return create_event_factory({"action": "user.created", "category": "auth"})(overrides)

    @staticmethod
    def user_updated(overrides: Optional[Dict[str, Any]] = None) -> EventInput:
        return create_event_factory({"action": "user.updated", "category": "auth"})(overrides)

    @staticmethod
    def user_deleted(overrides: Optional[Dict[str, Any]] = None) -> EventInput:
        return create_event_factory({"action": "user.deleted", "category": "auth"})(overrides)

    @staticmethod
    def user_login(overrides: Optional[Dict[str, Any]] = None) -> EventInput:
        return create_event_factory({"action": "user.login", "category": "auth"})(overrides)

    @staticmethod
    def api_request(overrides: Optional[Dict[str, Any]] = None) -> EventInput:
        return create_event_factory({"action": "api.request", "category": "api"})(overrides)

    @staticmethod
    def api_error(overrides: Optional[Dict[str, Any]] = None) -> EventInput:
        return create_event_factory({"action": "api.error", "category": "error"})(overrides)

    @staticmethod
    def billing_subscription_created(overrides: Optional[Dict[str, Any]] = None) -> EventInput:
        return create_event_factory({"action": "billing.subscription.created", "category": "billing"})(overrides)

    @staticmethod
    def system_pipeline_error(overrides: Optional[Dict[str, Any]] = None) -> EventInput:
        return create_event_factory({"action": "system.pipeline.error", "category": "system"})(overrides)


def generate_event_batch(count: int, factory: Optional[callable] = None) -> List[EventInput]:
    """Generates a batch of events"""
    default_factory = create_event_factory()
    return [
        factory(i) if factory else default_factory({"action": f"test.action.{i}"})
        for i in range(count)
    ]


def event_with_changes(
    field: str, old_value: Any, new_value: Any, overrides: Optional[Dict[str, Any]] = None
) -> EventInput:
    """Generates an event with changes tracking"""
    changes = [Change(field=field, old=old_value, new=new_value)]
    overrides = overrides or {}
    overrides["changes"] = changes
    return create_event_factory()(overrides)


# Export singleton instance
event_factories = EventFactories()

