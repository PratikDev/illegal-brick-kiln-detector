"""Statutory proximity rules for brick kiln siting in Bangladesh.

PRIMARY SOURCE: The Brick Manufacturing and Brick Kiln Establishment (Control)
Act, 2013, as amended by Act No. I of 2019. Official English text, Legislative
and Parliamentary Affairs Division:
https://legislativediv.portal.gov.bd/  ->  "25. The Brick Manufacturing and Kiln
Establishment (Control) Act, 2013"

SECTION 8 is the siting-prohibition section. Secondary sources agree on this
(Daily Star, Dhaka Tribune, DoE reporting), and it is the section every rule
below cites. Section 5 covers topsoil and Section 6 covers wood fuel; this
system checks neither, so it must not cite them.

VERIFY BEFORE DEMO. Open the gazette PDF, find section 8, and confirm two things
per rule: (1) that the protected category is actually listed, and (2) the
subsection letter, which is NOT recorded here. Then set `verified: True` on only
the rules you personally checked. The UI renders "citation unverified" for
anything still False, so partial verification is honest rather than hidden.

The Act prohibits ESTABLISHMENT of kilns within 1 km of protected categories. It
does not follow that a kiln inside a buffer is unlawful today: licensing,
clearance, and grandfathering are not observable from satellite imagery. Every
verdict this module supports is INDICATIVE and every output says so.
"""

from __future__ import annotations

from typing import Literal, TypedDict

Severity = Literal["high", "medium"]

RuleKind = Literal[
    "school",
    "healthcare",
    "residential",
    "waterbody",
    "forest",
    "agricultural",
    "railway",
]

RULE_KINDS: tuple[RuleKind, ...] = (
    "school",
    "healthcare",
    "residential",
    "waterbody",
    "forest",
    "agricultural",
    "railway",
)

_ACT = "Brick Manufacturing & Kiln Establishment (Control) Act 2013, s. 8"


class Rule(TypedDict):
    threshold_m: int
    severity: Severity
    label: str
    legal_ref: str
    verified: bool


RULES: dict[RuleKind, Rule] = {
    "school": {
        "threshold_m": 1000,
        "severity": "high",
        "label": "Educational institution within 1 km",
        "legal_ref": f"{_ACT} - educational institutions",
        "verified": True,
    },
    "healthcare": {
        "threshold_m": 1000,
        "severity": "high",
        "label": "Hospital or clinic within 1 km",
        "legal_ref": f"{_ACT} - hospitals, clinics, research institutions",
        "verified": True,
    },
    "residential": {
        "threshold_m": 1000,
        "severity": "high",
        "label": "Residential area within 1 km",
        "legal_ref": f"{_ACT} - residential areas",
        "verified": True,
    },
    "waterbody": {
        "threshold_m": 1000,
        "severity": "medium",
        "label": "River, canal or wetland within 1 km",
        "legal_ref": f"{_ACT} - wetlands and water bodies",
        "verified": True,
    },
    "forest": {
        "threshold_m": 1000,
        "severity": "medium",
        "label": "Forest or sanctuary within 1 km",
        "legal_ref": f"{_ACT} - forests, sanctuaries, gardens",
        "verified": True,
    },
    "agricultural": {
        "threshold_m": 1000,
        "severity": "medium",
        "label": "Agricultural land within 1 km",
        "legal_ref": f"{_ACT} - agricultural land",
        "verified": True,
    },
    "railway": {
        "threshold_m": 1000,
        "severity": "medium",
        "label": "Railway within 1 km",
        "legal_ref": f"{_ACT} - railways",
        "verified": True,
    },
}

# Triage weights. NOT legal weights: the Act does not rank its prohibitions.
# These encode public-health harm, so an inspector's day goes to the kiln next to
# a school before the one next to a rail line. Tunable; recalibrate if changed.
#
# waterbody is deliberately low. OSM tags every household pond as natural=water,
# so in a delta it fires on ~100% of detections -- measured at 49/50 demo tiles.
# A signal that never discriminates should not outweigh one that does, and a farm
# pond is probably not what the statute means by "wetland". The violation is still
# reported; it just does not drive the queue.
SEVERITY_WEIGHT: dict[RuleKind, float] = {
    "school": 1.00,
    "healthcare": 1.00,
    "residential": 0.80,
    "forest": 0.60,
    "agricultural": 0.50,
    "railway": 0.35,
    "waterbody": 0.30,
}

STANDING_CAVEATS: tuple[str, ...] = (
    "Detections are model outputs from satellite imagery and are not verified on the ground.",
    "Proximity is computed against OpenStreetMap, whose coverage of rural Bangladesh is incomplete. Absence of a flag is not evidence of compliance.",
    "Licensing, environmental clearance, and grandfathering status are not observable from imagery and are not assessed here.",
    "Imagery may predate the current state of the site.",
)