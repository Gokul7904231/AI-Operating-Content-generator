"""Capability Registry for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from typing import Dict, List, Optional

import structlog

from factoryos.guardian.capabilities.models import Capability
from factoryos.guardian.core.exceptions import GuardianCapabilityError

logger = structlog.get_logger(__name__)


class CapabilityRegistry:
    """Authoritative allowlist registry of legal floor worker capabilities."""

    def __init__(self, floor_id: Optional[str] = None):
        self.floor_id = floor_id
        self._capabilities: Dict[str, Capability] = {}

    def register(self, capability: Capability) -> None:
        """Register a new capability in the allowlist registry."""
        if self.floor_id and capability.floor_id != self.floor_id:
            raise GuardianCapabilityError(
                f"Capability '{capability.name}' floor_id '{capability.floor_id}' does not match registry floor_id '{self.floor_id}'."
            )
        if capability.name in self._capabilities:
            raise GuardianCapabilityError(f"Capability '{capability.name}' is already registered.")

        self._capabilities[capability.name] = capability
        logger.info("capability_registered", capability=capability.name, floor_id=capability.floor_id)

    def get(self, name: str) -> Capability:
        """Fetch capability by name or raise GuardianCapabilityError."""
        if name not in self._capabilities:
            raise GuardianCapabilityError(f"Unregistered capability requested: '{name}'. Action rejected.")
        return self._capabilities[name]

    def is_registered(self, name: str) -> bool:
        """Check if capability name is registered."""
        return name in self._capabilities

    def list_capabilities(self) -> List[Capability]:
        """Return list of all registered capabilities."""
        return list(self._capabilities.values())
