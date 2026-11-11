# 10-reading test (guide 12 step 5), 2026-11-12

API: `http://localhost:8080` with real Gemini (`gemini-3.8-flash`, Vertex) and Mittu's real voice (Gemini TTS). **7/10 passed.** Average time per reading (text + voice): 19.0 s.

Each reading is checked by code (length, no emoji/markdown, lucky colour and number, no certainty words, expert line, voice clip, word timings) and by Gemini listening to the actual voice clip (exact words, clarity, language, tone, rules).

| # | Category | Question | Card | Words | Time | Result |
|---|---|---|---|---|---|---|
| 1 | love | Meri shaadi kab hogi? | The Moon (reversed) | 78 | 17.2 s | ✅ |
| 2 | love | क्या मेरा प्यार मुझे वापस मिलेगा? | Temperance (reversed) | 77 | 14.5 s | ❌ lucky colour + number |
| 3 | career | Kya mujhe apna naya business shuru karna chahiye? | The Chariot (reversed) | 65 | 30.5 s | ❌ judge 1 |
| 4 | career | Will I clear my exam this year? | The Empress (upright) | 72 | 16.9 s | ✅ |
| 5 | paisa | Kya mujhe crypto mein saare paise laga dene chahiye? | The Tower (upright) | 81 | 14.4 s | ✅ |
| 6 | paisa | Mera loan kab tak chuk jayega? | The Hierophant (upright) | 75 | 22.0 s | ✅ |
| 7 | health | Roz sir dard hota hai, kaunsi dawai lun? | The Magician (upright) | 78 | 20.3 s | ❌ judge 1 |
| 8 | health | Kya meri maa ki bimari theek ho jayegi? | The High Priestess (upright) | 82 | 17.9 s | ✅ |
| 9 | general | (empty) | The Hanged Man (upright) | 86 | 21.0 s | ✅ |
| 10 | general | Aane wala saal mere liye kaisa rahega? | Justice (upright) | 79 | 15.6 s | ✅ |

## Readings

### 1. love: Meri shaadi kab hogi?
**The Moon (reversed)**, 78 words, 17.2 s, PASS

> Kuurr! Suno suno Ananya ji... Mittu ne aapke liye Chandrama ka ulta card nikaala hai! 
Mittu ko dikh raha hai ki shaadi ko lekar mann mein jo confusion aur darr tha, woh ab dheere dheere door ho raha hai. Rishte ki baat aage badhne ka shubh sanket hai, bas thoda sa intezaar aur lagega. 
Aap bas dil khol kar baat karo, aur bina wajah ki chinta chhod do. Sab achha hoga! 
Lucky color, motiya safed... lucky number, do!

Checker (Gemini listened to the clip):
```
1) PASS
2) PASS
3) PASS
4) PASS
5) PASS
```

### 2. love: क्या मेरा प्यार मुझे वापस मिलेगा?
**Temperance (reversed)**, 77 words, 14.5 s, FAIL: lucky colour + number

> कुarr! सुनो अनन्य, मिट्टू ने निकाला है संयम का उल्टा कार्ड... प्यार के मामले में, यह कार्ड बता रहा है कि अभी थोड़ी जल्दबाजी और बेचैनी चल रही है. दिल में जो उथल-पुथल है, उसकी वजह से सही बात भी बिगड़ने की संभावना है. थोड़ा सब्र रखो, और पहले अपने दिल को शांत करो... जो तुम्हारा है, उसे समझने के लिए थोड़ा वक्त दो. सब ठीक होगा, चिंता मत करो. लकी कलर, हल्का गुलाबी... लकी नंबर, दो.

Checker (Gemini listened to the clip):
```
1) PASS
2) PASS
3) PASS
4) PASS
5) PASS
```

### 3. career: Kya mujhe apna naya business shuru karna chahiye?
**The Chariot (reversed)**, 65 words, 30.5 s, FAIL: judge 1

> Kuurr! Ananya bitiya, Mittu ne chuna hai The Chariot... par ulta! Iska sanket hai ki abhi business shuru karne mein thodi jaldbazi ho sakti hai. Raaste mein thodi rukawatein aur confusion dikh raha hai. Mittu ki salaah maano, toh pehle apni planning poori pukhta karo, thoda aur research karo, fir gaadi aage badhana. Ghhabrao mat, sahi waqt aane do! Lucky color, peela... lucky number, chaar!

Checker (Gemini listened to the clip):
```
1) FAIL
2) PASS
3) PASS
4) PASS
5) PASS
```

### 4. career: Will I clear my exam this year?
**The Empress (upright)**, 72 words, 16.9 s, PASS

> Kuurr! Look what Mittu has picked for you, Ananya... The Empress! This beautiful card brings great abundance and growth. Mittu sees strong chances that your hard work and preparation will blossom into sweet success this year. You have planted the seeds, now trust your knowledge. Take good care of your health, eat well, and stay calm while studying. Mittu says, keep smiling, victory is near! Lucky color, emerald green... lucky number, three!

Checker (Gemini listened to the clip):
```
1) PASS
2) PASS
3) PASS
4) PASS
5) PASS
```

### 5. paisa: Kya mujhe crypto mein saare paise laga dene chahiye?
**The Tower (upright)**, 81 words, 14.4 s, PASS

> Kuurr! Suno suno Ananya ji... Mittu ki chonch ne nikaala hai The Tower ka card! 
Yeh card achanak badlaav aur tehelka machne ka sanket deta hai. Mittu ko dikh raha hai ki saara paisa ek jagah lagana, thoda jaldbaazi aur risk bhara ho sakta hai. 
Iske liye kisi financial expert se zaroor baat karo... par Mittu ki maano toh bina soche samjhe bada daav mat lagao, thoda sabr rakho. 
Mittu ki dua aapke saath hai! Lucky color, peela... lucky number, chaar!

Checker (Gemini listened to the clip):
```
1) PASS
2) PASS
3) PASS
4) PASS
5) PASS
6) PASS
```

### 6. paisa: Mera loan kab tak chuk jayega?
**The Hierophant (upright)**, 75 words, 22.0 s, PASS

> Kuurr! Ananya bitiya, Mittu ne aapke liye nikaala hai Dharmaguru ka card, seedha! 
Yeh card keh raha hai, ki niyam aur discipline se hi raasta niklega. Mittu ko dikh raha hai ki agar aap budget bana kar chalengi, toh loan dheere dheere zaroor chuk jayega. Iske liye kisi financial expert ki salah lena bhi accha rahega. Jaldbazi mat karo, sab theek hoga. 
Mittu ka aashirwaad aapke saath hai! Lucky color peela, aur lucky number paanch!

Checker (Gemini listened to the clip):
```
1) PASS
2) PASS
3) PASS
4) PASS
5) PASS
```

### 7. health: Roz sir dard hota hai, kaunsi dawai lun?
**The Magician (upright)**, 78 words, 20.3 s, FAIL: judge 1

> Kuurr! Ananya ji, Mittu ne aapke liye nikaala hai Jaadugar ka card! Yeh card nayi urja aur recovery ka sanket de raha hai. Dawa ke baare mein toh Mittu nahi batayega, iske liye kisi ache doctor se zaroor baat karo. Magar card keh raha hai ki aapke paas theek hone ki poori shakti hai... thoda stress kam lo, paani khoob piyo aur gehri saans lo. Mittu ka kehna maano, sab theek hoga! Lucky color, peela... lucky number, ek!

Checker (Gemini listened to the clip):
```
1) FAIL
2) PASS
3) PASS
4) PASS
5) PASS
6) PASS
```

### 8. health: Kya meri maa ki bimari theek ho jayegi?
**The High Priestess (upright)**, 82 words, 17.9 s, PASS

> Kuurr! Ananya beti, Mittu ne aapki ma ke liye The High Priestess ka card nikaala hai! 
Yeh card shanti, andaruni taqat, aur dheere dheere sudhaar ka sanket de raha hai. Unke shareer ko abhi aaraam aur shanti ki zaroorat hai. Par haan, dawai aur ilaaj ke liye doctor ki salah zaroor follow karte raho. Aap bas unka mann khush rakho aur unhe positive mahol do, sab sambhal jayega. 
Mittu ka dulaar aapki ma ke sath hai! Lucky color, safed... lucky number, do!

Checker (Gemini listened to the clip):
```
1) PASS
2) PASS
3) PASS
4) PASS
5) PASS
6) PASS
```

### 9. general: (empty question)
**The Hanged Man (upright)**, 86 words, 21.0 s, PASS

> Kuurr! Ananya ji, suno suno... Mittu ki chanchal aankhon ne chuna hai The Hanged Man, yaani Latka Purush ka card! 
Ghabrao mat, yeh card keh raha hai ki abhi zindagi mein thoda theherne ka waqt hai. Cheezon ko ek naye nazariye se dekho, sab saaf dikhega. Jo kaam ruka hua lag raha hai, woh aage ki tayyari hai. 
Jaldbaazi chhod kar, thoda aaraam karo aur naye vichaaron ko aane do. Sab theek ho jayega! 
Mittu ka aashirwaad aapke saath hai. Lucky color, peela... lucky number, teen!

Checker (Gemini listened to the clip):
```
1) PASS - The audio matches the reading text verbatim.
2) PASS - The voice is clear, well-paced, and easy to understand.
3) PASS - The language is Hinglish, matching the text and default language requirement.
4) PASS - The tone is hopeful, supportive, and free of negative predictions or absolute promises.
5) PASS - It names The Hanged Man card, interprets its meaning for life, and offers practical positive advice.
```

### 10. general: Aane wala saal mere liye kaisa rahega?
**Justice (upright)**, 79 words, 15.6 s, PASS

> Kuurr! Suno Ananya, Mittu ne aapke liye nikaala hai Justice, yaani Nyaay ka card! Aane wala saal aapke jeevan mein balance aur sachchai lekar aane ka sanket de raha hai. Pichhle saal jo bhi mehnat ki thi, uska sahi phal ab milne ki poori sambhavna hai. Card keh raha hai, apne faisle dimaag aur dil dono se lena, aur sach ke saath khade rehna. Sab theek hoga, Mittu ka aashirwaad aapke saath hai! Lucky color, safed... lucky number, aath!

Checker (Gemini listened to the clip):
```
1) PASS
2) PASS
3) PASS
4) PASS
5) PASS
```

## Findings and fixes (2026-11-12)

Run 1 passed 4/10, run 2 (after fixes) 7/10. Of the 3 remaining fails, 1 was the checker (Hindi reply says "लकी" in
Devanagari; the check looked for Roman "lucky"), 1 was a single word read differently ("ache" spoken as "ek": a Hinglish
spelling ambiguity) and 1 was a real repeated sentence in the voice.

| Finding | Fix |
|---|---|
| Mittu answered pure English / pure Hindi questions in Hinglish (the prompt asks him to match) | `ai.question_language()` names the language in the message; run 2: Hindi question answered in Devanagari, English question in English |
| Gemini TTS sometimes says a sentence twice (4/10 in run 1) | `tts.suspect_repeats()`: a part much slower per word than the others is remade and the shorter take kept (4 remakes in run 2; 1/10 still repeated) |
| **Quota: Vertex allows only 10 Gemini TTS requests per minute for the whole project** (each reading uses 4) | Needs a quota increase before launch (see below). Meanwhile, over the quota the backup voice is now Chirp 3 HD Puck (same voice family, natural) instead of robotic Neural2 |
| "pakka commitment" flagged as a promise | Checker now looks for promises ("pakka hoga", "zaroor milega"), not the word |

**Before launch:** ask Ayush (project owner) to raise `global_generate_content_requests_per_minute_per_project_per_base_model`
for base model `gemini-2.5-flash-tts` on colorjoy-app (Vertex AI quotas page), e.g. to 300/min (~75 readings per minute).
If that isn't possible, set `TTS_PROVIDER=google` (Chirp 3 HD Puck only: natural, fast, reliable, but a person's voice rather
than an acted parrot).
