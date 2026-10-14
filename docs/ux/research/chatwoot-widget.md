# Chatwoot website widget: UX/UI reference

Researched 2026-10-14 from Chatwoot's docs, help centre, product pages and the open-source widget code (`develop` branch). Where the docs and the code disagree, this note follows the code and says so. No public demo was found, so this note describes the widget from its code and docs, not from using it. Bracketed numbers like [S3] point to the Sources list at the end.

## 1. End-to-end flow

- **Launcher.** A floating bubble that sits bottom-right or bottom-left. It comes in two designs, `standard` (an icon) and `expanded_bubble` (an icon with a text label). Unread messages put a dot on the bubble and play a short alert sound. [S2][S12][S13]
- **Open/close.** Below 667px wide the widget fills the whole screen. On wider screens it is a 400px-wide panel, up to 640px tall, with 16px rounded corners. [S11]
- **Home screen.** The home screen shows the welcome heading and tagline, set in the inbox settings. Below them is a card with team availability (agent avatars plus an online/away line) and a start link that becomes "continue" once a thread exists. Help-centre articles can appear underneath. [S1][S9]
- **Pre-chat form (optional).** The built-in fields are Name, Email and Phone. Any other field must first be created as a custom attribute. Each field can be marked required. A message field is also required unless a campaign started the chat. Fields the site already knows through the SDK are skipped. [S1][S8]
- **Persistence.** The widget stores its session in a `cw_conversation` cookie that lasts 365 days by default, so the same thread reopens on later page loads. Logged-in sites can call `setUser` with an HMAC `identifier_hash`, which keeps chat history across sessions. `reset()` clears the session on logout. [S3][S12][S14]
- **Email continuity.** If the visitor has left when an agent replies, the reply goes out by email. The visitor can answer that email and the answer lands back in the same chat thread. This only works if an email address was collected, through the SDK, the pre-chat form or the email prompt. [S4]
- **Transcript.** When a conversation is resolved, the reply box disappears unless an admin allows messages after resolution. In its place the visitor sees a button to start a new conversation, plus a request-transcript button if their email is known. [S10]
- **Business hours.** Admins set opening hours per day with a timezone and write an offline message for out-of-hours visitors. When Captain is on for the inbox, the offline message is not shown. [S1]
- **Reply-time display.** Inside business hours the widget shows one of three presets: "Typically replies in a few minutes", in a few hours, or in a day. Outside business hours it says when the team will be back, such as at a set time or tomorrow. [S1][S9]

## 2. Message types and interactive elements

Every interactive type below is an agent message with a `content_type`, sent through the API. [S5][S6]

| Type | How it renders (from the code) | After the visitor acts |
|---|---|---|
| Text | Markdown, sanitised before display | Not applicable |
| Attachments | Image, video, audio player, or a downloadable file bubble | The visitor's own uploads show an uploading state |
| `input_select` | A prompt bubble with **rounded pill buttons** outlined in the widget colour. The docs summary calls it a dropdown, but the code renders pills. [S7] | The pills disappear, and the chosen title appears as the visitor's own bubble. [S6] |
| `form` | Full-width fields (text, textarea, email, select) with a Submit button | The form disappears, and each submitted value appears as its own visitor bubble. [S6] |
| `cards` | Image, title, description, and buttons that either open a link or send a postback | A link opens the page; a postback sends a payload back into the chat |
| `article` | A list of linked articles with titles and descriptions | Tapping an article opens the link |
| `input_email` | An inline email field with a chevron submit button, validated before sending | The email appears as a visitor bubble [S15] |
| `input_csat` | A survey card with a coloured top border, emoji or 5-star rating, and an optional free-text comment | The title changes to a thank-you message [S16] |

- **Email prompt.** An automatic email-collection prompt is on by default for website inboxes. [S1]
- **CSAT.** Off by default. It is sent when an agent resolves the conversation and can be limited to conversations with certain labels. The survey message is customisable, up to 200 characters. [S17]
- **Typing indicator.** An animated GIF inside an agent bubble that sticks to the bottom of the thread. [S6]
- **Delivery status.** Visitor bubbles have only "in progress" and "failed" states. A failed message shows a send-failed notice with a retry button. The widget has no read ticks, even though the features page lists read receipts. [S10][S2]
- **Reply-to.** A visitor can quote a message: by swiping it on touch screens, or with a reply button that appears on hover. [S10]

## 3. Bots and AI

- **Agent bots.** A bot connected to an inbox gets every new conversation in a "pending" status, answers it through webhooks and the API, and hands over by setting the status to "open". An agent can send a conversation back to the bot by setting it to "pending" again. [S18]
- **Captain** is Chatwoot's built-in AI agent. It answers from the help docs and past conversations, and hands over to a human when it lacks the context to answer. [S19] An admin can limit who it answers (audience rules) and when (any time, in hours, or out of hours). Conversations it does not pick up are marked open for the team. [S20]
- **Telling bot from human.** The widget has **no AI badge**. Each message shows the sender's name and avatar. When there is no sender, the name falls back to the inbox name or the word "Bot", and the avatar to a generic bot image. [S6][S9] None of the docs I read describe a message telling the visitor about the handover. [S19][S20]

## 4. Visual design

- **Header.** Optional back chevron, a round 32px avatar, the inbox name, a teal dot when agents are online, the availability or reply-time line in small text, and a pop-out action. [S21]
- **Bubbles.** Visitor bubbles are on the right, filled with the widget colour, with text in whichever colour contrasts. Agent bubbles are on the left, on a neutral surface, with a 24px avatar and the sender's name under the last bubble in a group. [S6][S10]
- **Theming.** Admins pick one widget colour and set the position, the bubble design and the language (50+ languages, including right-to-left scripts). The theme can be light, dark or auto. [S1][S2][S3][S13]
- **Input bar.** A text field with attachment and emoji buttons; both can be turned off through SDK settings. [S3]
- **Accessibility.** The code has some alt text, such as on the typing image, but the source I read showed no documented ARIA or contrast guidance. Text on brand-coloured buttons is set to a contrasting colour automatically. [S15][S6]

## 5. Takeaways for the trip assistant

Patterns to adopt:

1. **[Chatwoot]** After a pick, hide the choice pills and show the chosen answer as the visitor's own bubble. The thread then reads as a clean transcript.
2. **[Chatwoot]** Show a form answer as visitor bubbles, then remove the form. Use this for the final review step.
3. **[Chatwoot]** Collect the email inline in the thread: one field, a submit chevron, and validation before sending. Avoid a modal gate.
4. **[Chatwoot]** Skip any question whose answer is already known, such as an email from a logged-in session.
5. **[Chatwoot]** Go full screen below about 667px wide. On a mobile web app, open the chat as a full-screen route or sheet, not a floating panel.
6. **[Chatwoot]** Set an honest expectation in the header with a plain reply-time line, such as "The shop team usually replies within a day by email".
7. **[Chatwoot]** Once the chat is complete, replace the input with clear next actions ("Start a new request", "Email me a copy").
8. **[Chatwoot]** Give failed messages a visible retry, and use a sticky typing indicator while the scripted or AI reply is being prepared.
9. **[Recommendation]** Clearly label the assistant as automated ("Trip assistant · automated"). Chatwoot relies on name and avatar only, which becomes ambiguous once AI replies arrive.
10. **[Recommendation]** At handover, post a system message saying who takes over, by which channel, and when ("Sent to the shop team. They'll email you at x@y within 1 working day.").
11. **[Recommendation]** Model each step as a typed message (`choice`, `text`, `date`, `email`, `summary`). Chatwoot's `content_type` and `submitted_values` approach works for this, and lets an AI emit the same types later without UI changes.
12. **[Recommendation]** Show the summary as a card with an "Edit" control on each answer before sending. Chatwoot's forms cannot be edited after submission.

Things to avoid:

- **[Recommendation]** Don't use controls that only appear on hover, like Chatwoot's reply button. Touch users can't see them.
- **[Recommendation]** Don't advertise read receipts or live presence you don't have. Chatwoot's marketing claims more than the widget shows.
- **[Recommendation]** Don't put a pre-chat form in front of the first question. Ask for details one at a time inside the conversation.
- **[Recommendation]** Don't let the offline message disappear just because a bot is answering, as Chatwoot does when Captain is on. Visitors still need to know when a human will respond.
- **[Recommendation]** Don't rely on a generic "Bot" name and stock avatar. Give the assistant a branded identity.

## Sources

- S1 https://www.chatwoot.com/hc/user-guide/articles/1677580558-website-live-chat-settings-explained
- S2 https://www.chatwoot.com/features/live-chat
- S3 https://www.chatwoot.com/hc/user-guide/articles/1677587234-how-to-send-additional-user-information-to-chatwoot-using-sdk
- S4 https://chatwoot.com/docs/product/channels/live-chat/conversation-continuity
- S5 https://www.chatwoot.com/docs/product/others/interactive-messages/
- S6 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/widget/components/AgentMessage.vue (also `AgentMessageBubble.vue`, `AgentTypingBubble.vue` in the same folder)
- S7 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/shared/components/ChatOptions.vue (and `ChatOption.vue`)
- S8 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/widget/components/PreChat/Form.vue
- S9 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/widget/i18n/locale/en.json (also `widget/components/TeamAvailability.vue`, `widget/views/Home.vue`)
- S10 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/widget/components/UserMessage.vue (also `ChatFooter.vue`, `UserMessageBubble.vue`)
- S11 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/sdk/sdk.css
- S12 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/sdk/IFrameHelper.js
- S13 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/sdk/constants.js (and `sdk/settingsHelper.js`)
- S14 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/sdk/cookieHelpers.js
- S15 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/widget/components/template/EmailInput.vue
- S16 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/shared/components/CustomerSatisfaction.vue
- S17 https://www.chatwoot.com/hc/user-guide/articles/1677503828-how-to-enable-csat-surveys
- S18 https://www.chatwoot.com/docs/product/others/agent-bots
- S19 https://www.chatwoot.com/hc/user-guide/articles/1738101283-captain-_-introduction
- S20 https://www.chatwoot.com/hc/user-guide/articles/1786119055-control-who-captain-replies-to-and-when-audience-schedule
- S21 https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/widget/components/ChatHeader.vue
