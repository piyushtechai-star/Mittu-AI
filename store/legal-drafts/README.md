# Mittu AI legal pages: drafts for Ayush

Four drafts to publish at https://houseoftech-legal.web.app/mittuai/...

| File | Publish at |
|---|---|
| `mittuai/privacy.html` | /mittuai/privacy |
| `mittuai/terms.html` | /mittuai/terms |
| `mittuai/payment-cancellation.html` | /mittuai/payment-cancellation |
| `mittuai/delete-account.html` | /mittuai/delete-account |

Markup, CSS and section order are copied from the corrected **Naksh** pages (`naksh-app/store/legal-fixed/naksh/*.html`, see its `CHANGES.md`). Only the accent colour changed (Mittu parrot green `#17844B`). Internal links use `/mittuai/...`. Company name, email (support@houseoftech.ai), address, governing law (India) and jurisdiction (Gurgaon, Haryana) are exactly as on the Naksh pages. "Last updated" is set to 12 November 2026; change it to the publish date.

Naksh-only content was removed: kundli, birth details, partners / Guna Milan, astrologer guides and chat, microphone / voice input, Listen, daily reminders / notifications, OpenStreetMap Nominatim, sharing of kundli/horoscopes, "delete a single chat / Remove partner", and the "Deleting a single birth profile" section on the delete page. All Mittu facts come from the fact list supplied on 2026-11-12. No ₹ prices are in the pages; they point to the paywall ("the price shown in the App").

Refund wording (eligible / non-eligible cases, timelines) is Naksh's, adapted to Mittu. One deliberate difference from Naksh: on cancellation, access **continues until the end of the trial or the period already paid for** (Naksh says access ends at once).

## Every [[TO CONFIRM]] placeholder (remove the brackets before publishing)

| # | Page(s) | Placeholder | What's needed |
|---|---|---|---|
| 1 | privacy (s.4 and s.7) | `[[TO CONFIRM wording with Ayush]]` after "Gemini requests use Google's global endpoint, so this processing may take place outside India" | Confirm the wording (and that the endpoint really is `global`, not `asia-south1`). If a regional endpoint is used, drop the outside-India sentence. |
| 2 | privacy (s.4) | `[[TO CONFIRM]]` after "Under Google Cloud's terms, your prompts and the replies are not used to train Google's models" | Confirm Vertex AI (paid Google Cloud project) is used, not the free Gemini API, so the no-training statement holds. |
| 3 | privacy (s.6) | `[[TO CONFIRM: Meta Automatic Advanced Matching is OFF]]` | Check in Meta Events Manager that Automatic Advanced Matching is off, so no phone number or name reaches Meta. |
| 4 | privacy (s.9), delete-account ("What may be retained") | `[[TO CONFIRM retention, e.g. 30 days]]` | Real retention period for OTP / rate-limit records and server (Cloud Run) logs. Make sure there is an automatic clean-up (e.g. Firestore TTL) matching what is written. |
| 5 | privacy (s.11), terms (s.4) | `[[TO CONFIRM: does sign-up ask users to confirm they are 18 or older? ...]]` | If the app has an 18+ checkbox / confirmation at sign-up, add the suggested sentence; otherwise delete the placeholder (and consider adding the confirmation to the app). | **Answered 2026-11-14:** yes, sign-up now asks for the date of birth and refuses anyone under 18; also add date of birth (and optional time/city of birth, gender) to the data collected, used only to personalise readings.
| 6 | payment-cancellation (s.5) | `[[TO CONFIRM: does access continue or pause while a failed renewal is pending?]]` | How the backend treats Razorpay `pending` / `halted` status. State the real behaviour. |
| 7 | payment-cancellation (s.6, Option A) | `[[TO CONFIRM: the merchant / mandate name users will see in their UPI app]]` | The name shown on the UPI Autopay mandate (e.g. "HouseofTech" or "Mittu AI"), so users can find it. |

## Other points to check (not placeholders)

- **Phone number and GSTIN**: the corrected Naksh pages contain neither (only company name, email and address), so the Mittu drafts don't either. Add them if HouseofTech wants them on Mittu's pages.
- **Grievance Officer**: no Naksh page names one; the Mittu drafts don't either. Consider adding one (name + email) under India's IT Rules / DPDP Act.
- **Timelines copied from Naksh**: cancellation by email within 2 working days; refund acknowledgement 2 working days, resolution 7–10 working days; duplicate refunds 5–10 working days; deletion within 30 days; OTP verification of deletion requests ("we may send an OTP"). Confirm support can meet these for Mittu.
- **Email from "registered number"**: the facts say users email "from their registered number". An email can't be sent from a phone number, so the pages say "quoting your registered mobile number".
- **Name kept after deletion**: deletion removes the name from the profile, but the name printed on GST invoices is kept with the invoice (tax law). The pages say this explicitly.
- **Play / App Store billing**: terms s.9 says "we do not use Google Play Billing or Apple In-App Purchase" (copied from Naksh, true for Razorpay-only). The fact list mentions Keychain (iOS), so check store policy for digital subscriptions sold outside Play/App Store billing.
- **Meta SDK opt-out text**: copied from Naksh (Android examples). If there is an iOS build, consider adding the iOS path (Settings → Privacy & Security → Tracking).
- **Past readings in the app**: the drafts don't say whether users can see their reading history in the app; they just say readings are stored in the account and advise screenshots before deletion. Add a line if a history screen exists.
- **No receipt claim**: Naksh says "a receipt is emailed or messaged"; this was dropped for Mittu (not in the facts). The GST invoice in Profile → Invoices is the stated record.
- **AI wording**: the pages say plainly that readings are AI-generated (Gemini via Vertex AI) and Mittu is an animated character, per the rule that this disclosure belongs in the policy pages (the app shows no AI labels).
