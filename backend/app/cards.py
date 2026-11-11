"""The 22 Major Arcana. The BACKEND picks the card and its orientation (guide 06), never the app."""
from __future__ import annotations

import secrets

# id, English name, Hindi name (Roman, as Mittu says it), Hindi (Devanagari)
CARDS: list[tuple[int, str, str, str]] = [
    (0, "The Fool", "Mastmaula", "मूर्ख"),
    (1, "The Magician", "Jaadugar", "जादूगर"),
    (2, "The High Priestess", "Mahapujaarin", "महापुजारिन"),
    (3, "The Empress", "Samraagyi", "साम्राज्ञी"),
    (4, "The Emperor", "Samraat", "सम्राट"),
    (5, "The Hierophant", "Dharmaguru", "धर्मगुरु"),
    (6, "The Lovers", "Premi", "प्रेमी"),
    (7, "The Chariot", "Rath", "रथ"),
    (8, "Strength", "Shakti", "शक्ति"),
    (9, "The Hermit", "Sanyaasi", "संन्यासी"),
    (10, "Wheel of Fortune", "Bhagya Chakra", "भाग्य चक्र"),
    (11, "Justice", "Nyaay", "न्याय"),
    (12, "The Hanged Man", "Latka Purush", "लटका पुरुष"),
    (13, "Death", "Parivartan", "परिवर्तन"),
    (14, "Temperance", "Sanyam", "संयम"),
    (15, "The Devil", "Mohjaal", "मोहजाल"),
    (16, "The Tower", "Meenar", "मीनार"),
    (17, "The Star", "Taara", "तारा"),
    (18, "The Moon", "Chandrama", "चंद्रमा"),
    (19, "The Sun", "Surya", "सूर्य"),
    (20, "Judgement", "Punarjaagran", "पुनर्जागरण"),
    (21, "The World", "Sansaar", "संसार"),
]
REVERSED_PERCENT = 35


def card_view(card_id: int) -> dict:
    cid, en, hi_roman, hi = CARDS[card_id]
    return {"id": cid, "name": en, "hindi": hi_roman, "hindiScript": hi}


def draw() -> tuple[int, str]:
    """Cryptographically random card and orientation."""
    return secrets.randbelow(len(CARDS)), ("reversed" if secrets.randbelow(100) < REVERSED_PERCENT else "upright")
