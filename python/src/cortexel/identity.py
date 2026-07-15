"""Build identity — read from the generated mirror, never guessed."""

from __future__ import annotations

from .generated.catalog import (
    PACKAGE_VERSION,
    REQUEST_CONTRACT,
    ARTIFACT_CONTRACT,
    CONTRACT_DIGEST,
    CATALOG_DIGEST,
    STABLE_SKILL_IDS,
)


def get_build_identity() -> dict:
    """Every identity axis, named. A local build never claims a release commit."""
    return {
        "packageVersion": PACKAGE_VERSION,
        "requestContract": REQUEST_CONTRACT,
        "artifactContract": ARTIFACT_CONTRACT,
        "contractDigest": CONTRACT_DIGEST,
        "catalogDigest": CATALOG_DIGEST,
        "stableSkillCount": len(STABLE_SKILL_IDS),
        "sourceRevision": "unreleased-worktree",
        "release": False,
    }
