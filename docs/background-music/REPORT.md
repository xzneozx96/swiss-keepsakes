# Guest background music: verification report (2026-10-16)

Browser: Orca built-in (Chromium), isolated no-HMR vite on :5295 (stopped). 390x844 mobile emulation and 1280x800.
Note: Orca only paints a page after a screenshot or tab switch, so CSS transitions stall until a frame is forced.

## Fixed in this pass
- Stop did not always rewind: a MutationObserver-triggered sync during the fade replaced the fade's rewind callback with a plain pause. Rewind now lives in one `silence()` used by every fade-out (background-music.tsx).
- Owner change 1: wave/equaliser removed everywhere; launcher and cover use a musical-note icon (`MusicNote`). Playing state = soft accent tint on the launcher, no animation.
- Owner change 2: sheet redesigned Spotify-style (60% square cover with Swiss-red gradient and note, serif title, 4px accent progress with hover/drag/focus thumb, elapsed/total times, stop, back 10 s, play/pause 64px, forward 10 s, quiet volume row). Fits 390x844 without scrolling (532/532 px), also in DE. New EN/DE labels for the skip buttons.
- CREDITS.txt: provided by the owner on 2026-10-16, rights holder/source to be confirmed (PRD section 11), plus the encode command.

## Acceptance
1. Autoplay, fresh storage: PASS. Orca Chromium allowed it (t advanced, no gesture). Blocked fallback: PASS with `play()` stubbed to reject NotAllowedError and a remount (merchant route and back): one rejected call, listeners armed, first real click started it. Keydown and touchend listeners are armed the same way but only the click was driven.
2. Stop / persistence: PASS from clean storage (other stale tab closed first). Stop: t=0:00, `sk.music=false`. Reload: stays at 0:00; a real click and a keypress do not start it. Play after stop works; reload after play autoplays again.
3. One audio element, 7 navigations (gifts, tours, stories, account, cart, search, home): PASS, same element, currentTime advancing every time.
4. Seek: mouse PASS (click at slider centre -> 174.9 s of 349; drag from slider to the Play button -> 174.9 s). Keyboard PASS (ArrowRight +5 s, ArrowLeft -5 s, Home 0, End = end of track; while playing End wraps to 0:00 because the track loops, paused it lands on 5:48). Skip buttons +/-10 s PASS, clamped at 0. TOUCH NOT TESTED (the CLI drives a mouse); it uses the native range input.
5. Story duck: PASS. Story clip play -> music pauses; story ended -> music resumes; with the sheet open, programmatic story play/pause ducks and resumes. Video/YouTube embed pause not driven (iframe presence check by code only).
6. visibilitychange hidden/visible: NOT VERIFIED. Orca pins `document.hidden` to false (non-configurable) and no second tab could be made hidden; handler reviewed in code only.
7. Merchant view (`sk.demo` role owner, reload, #/store, #/store/calendar, #/store/orders): PASS, no audio element, no launcher.
8. Stacked FABs: PASS on home, keepsake list, tours list, tour detail, story, account, cart at 390 EN and DE and 1280; booking sheet covers them. Rule, as the code behaves: the launcher stacks on the assistant button wherever `TripAdviceButton` renders (home, tour detail, stories); on tab-bar screens without it (keepsake list, tours list, account) it sits alone in the assistant's slot above the tab bar; on screens with `hideTabBar` and no assistant (keepsake detail, cart, booking, pay) there is no launcher so the in-flow action bar stays clear, and music keeps playing. Caveat: like the assistant, the floating launcher can sit over a card heart while scrolling (tours list, seen adjacent to a heart).
9. Network (proxy throttled to 150 KB/s, cache disabled): PASS. Music off: 0 mp3 requests at first paint and idle. Sheet opened: 2 range requests, 113 KB sent in total (duration 5:48 shown; Chromium stopped at ~9 s buffered). Music on, first visit: request starts 3.5 s in (after load + 300 ms) and then streams the whole file, 4.14 MB in ~25 s; that is normal while playing.
10. Sheet a11y: PASS. Opened with Enter, focus lands in the dialog, Tab cycles Close, Position, Stop, Back 10, Pause, Forward 10, Mute, Volume and wraps, Escape closes and focus returns to the launcher. Labels and `aria-valuetext` ("0 minutes 26 seconds of 5 minutes 48 seconds", DE "0 Minuten 15 Sekunden von 5 Minuten 48 Sekunden") verified. Focus ring screenshot: focus-ring-390.png.

## Track
- File: front-end/src/assets/audio/background-swiss-keepsakes.mp3, 4,184,928 bytes (4.2 MB), 5:48.744, 96 kbps joint stereo, 48 kHz. Owner's original is 8,065,082 bytes (never copied into the repo).
- Encode (reproduced byte for byte): `ffmpeg -i swiss-keepsake-background-audio.mpeg -vn -map_metadata -1 -map 0:a -c:a libmp3lame -b:a 96k -joint_stereo 1 -write_xing 0 -id3v2_version 0 background-swiss-keepsakes.mp3`
- Loop gap: not gapless. The source itself fades to silence at both ends (original: 0.16 s below -60 dB at the head, 0.20 s at the tail; the encode keeps the same), so the loop has an audible quiet dip of roughly 0.4 s plus a few tens of ms of decoder delay (no Xing/LAME tag, so Chromium cannot trim it). Peaks at the edges are under -54 dB, so a click is unlikely. Fixing it needs a source loop with matched ends, or a Web Audio crossfade.

## Not verified / limits
- Real iOS Safari autoplay and background behaviour cannot be tested here.
- Touch seek, hidden-tab pause, embed (video) pause as above.
- Sheet subtitle shows the playback status ("Playing / Paused / Stopped") under the track title instead of an artist line, because no artist is known.
- Track origin (not AI, licensed) is still to be confirmed by the owner (CREDITS.txt).

## Follow-up 2026-10-16: Stop removed, track named
- Stop button, `music.stop`, `music.status.stopped`, `musicControls.stop`, the `paused` store field and `StopIcon` are gone. Pause persists `sk.music=false` (no autostart on reload or gestures); play persists true. Tab hidden, story/video ducking and loop end only pause the element, never `enabled`. Pausing no longer rewinds.
- Track "A Little of You", subtitle "bachhac" (EN and DE). `navigator.mediaSession` metadata plus play, pause, seekto, seekbackward, seekforward handlers (same paths as the sheet). `<audio>` has `aria-label` = "Background music".
- Checked in Orca on isolated :5296 (390x844 EN/DE, 1280x800): sheet has no Stop, 545/545 px (no scroll); pause -> sk.music=false, reload stays paused, pointerdown/keydown do not start it; play -> true; story-audio duck pauses and resumes with sk.music true; mediaSession metadata set, 5 handlers registered, seekto/seekforward/seekbackward/pause/play work through them; skip +-10 and slider arrow +5 work. NOT VERIFIED: hidden tab (Orca pins `document.hidden`; code path never writes `enabled`).
- Screenshots: sheet-playing-390, sheet-paused-390, sheet-playing-de-390, sheet-playing-desktop-1280 (stopped ones deleted). Earlier items above that mention Stop are superseded.
