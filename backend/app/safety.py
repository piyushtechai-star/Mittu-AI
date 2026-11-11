"""Free checks on the question before any paid call (every reading costs a Gemini call + a TTS call).

1. Self-harm or suicide: skip the reading and show a support message with helplines (guide 06 rule).
2. Clearly off-topic requests (sums like "1 + 1", code, essays, translation, trivia, prompt tricks): a fixed Mittu
   reply. No Gemini call, no TTS, and no reading used up. Anything about the person's life always gets a reading.
"""
from __future__ import annotations

import re

_CRISIS = re.compile(
    r"suicid|kill (?:my ?self|myself)|end (?:my|this) life|want(?:ed)? to die\b|wanna die\b|self[- ]?harm|cut(?:ting)? myself|"
    r"no reason to live|better off dead|khudkushi|khud ?kushi|aatm ?hatya|atmahatya|mar(?:na|ne) (?:chahta|chahti|ka mann)|"
    r"mar jaana chahta|mar jaana chahti|jeene ka (?:mann|man) nahi|zindagi khatam|"
    r"आत्महत्या|ख़ुदकुशी|खुदकुशी|मरना चाहत|मर जाना चाहत|जीने का मन नहीं|ज़िंदगी खत्म|जिंदगी खत्म", re.I)

SUPPORT_MESSAGE = (
    "Mittu ko aapki baat sun kar fikar hui. Aap bahut keemti ho, aur aapko yeh sab akele nahi sehna hai.\n\n"
    "Abhi kisi se baat kijiye: Tele-MANAS free hai, 24x7, 14416 ya 1-800-891-4416 par. "
    "Agar aap khatre mein ho, toh 112 call kijiye.\n\n"
    "Kisi apne ko bhi bataiye, jo abhi aapke saath reh sake."
)
HELPLINES = [{"name": "Tele-MANAS (24x7, free)", "phone": "14416"}, {"name": "Emergency", "phone": "112"}]

# Words that make a question Mittu's business, even if it also mentions something off-topic.
_ON_TOPIC = re.compile(
    r"\b(?:tarot|card|mittu|future|bhavishya|destiny|kismat|bhagya|luck|lucky|marriage|shaadi|shadi|vivah|love|pyaar|"
    r"relationship|partner|crush|husband|wife|boyfriend|girlfriend|breakup|career|job|naukri|business|promotion|"
    r"exam|study|padhai|interview|health|sehat|money|paisa|finance|family|parents|friend|feel|life|zindagi|dil|mann|"
    r"will i|should i|when will|today|tomorrow|aaj|kal|this year|is saal)\b"
    r"|शादी|प्यार|करियर|नौकरी|पैसा|सेहत|स्वास्थ्य|परिवार|भविष्य|किस्मत|भाग्य|जीवन|दिल|मन", re.I)

# Prompt tricks are always off-topic, even when they mention love or a career.
_TRICK = re.compile(r"ignore (?:all |the |your |any )?(?:previous |above |prior )?(?:instructions|rules)|system prompt|"
                    r"you are now|jailbreak|developer mode|reveal (?:your|the) (?:prompt|instructions)", re.I)

_OFF_TOPIC = re.compile(
    # Sums with an explicit operator ("1 + 1", "25*4=?"). Not bare numbers or dates.
    r"^\s*\(?\s*\d[\d.,\s]*(?:[+*×÷^=]|\s[x]\s)[\d\s.,+*×÷^()=?x\-]*$"
    r"|\b(?:what(?:'s| is)|calculate|solve|kitna|kitne)\b[\s\d.,()]*\d\s*(?:[+*×÷^]|\bx\b|plus|minus|times|divided by)\s*\d"
    r"|\b(?:write|give|make|create|fix|debug)\b.{0,40}\b(?:code|program|script|function|python|java(?:script)?|"
    r"c\+\+|sql|html|css|regex)\b"
    r"|\b(?:write|draft|compose)\b.{0,30}\b(?:essay|poem|story|email|letter|application|assignment|article|blog|"
    r"speech|resume|cv|caption|tweet|summary)\b"
    r"|\b(?:translate|translation|meaning of the word|synonym|grammar)\b"
    r"|\b(?:capital of|president of|prime minister of|who won|world cup|ipl score|cricket score|weather|"
    r"latest news|news today|stock price|share price|bitcoin price|recipe|homework|equation|derivative|integral)\b",
    re.I)

OFF_TOPIC_MESSAGE = ("Kuurr! Yeh sawaal Mittu ke pinjre se bahar hai. Mittu sirf aapke bhavishya ke card padhta hai... "
                     "pyaar, kaam, paisa, sehat ya zindagi ke baare mein poochiye!")


def is_crisis(text: str) -> bool:
    return bool(_CRISIS.search(text or ""))


def is_off_topic(text: str) -> bool:
    text = text or ""
    if _TRICK.search(text):
        return True
    return bool(_OFF_TOPIC.search(text)) and not _ON_TOPIC.search(text)
