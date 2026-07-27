# Corruption System Reference

_Generated 2026-07-27T07:33:39.753Z by `npm run docs:corruption`._

Run `npm run docs:corruption:watch` while editing corruption logic to keep this file updated live. The watcher monitors the source files listed in the appendix and rewrites this markdown whenever they change.

## Core Rules

- Corruption is stored in `localStorage.xp_corruption` and capped at `100`.
- `triggerOnce(key, gain)` applies a gain only once per key, tracked in `localStorage.xp_triggered`.
- `incrementCorruption(n)` always adds immediately, capped at `100`.
- During the innocent opening, raw corruption may still increase, but visible corruption is forced to `0`.
- Visible horror is gated by story state:
  - `canShowHorror = introGraceComplete && chapter !== ending`
  - `canShowHardHorror = introGraceComplete && chapter >= breach && chapter !== ending`
- The intro grace completes after 7 minutes, 8 meaningful interactions, or opening/running Command Prompt.

## Corruption Increases

### Files And Folders
| Item | Type | Gain | When | Source |
| --- | --- | --- | --- | --- |
| My Documents | folder | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| letter_to_mom.txt | txt | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| my_diary.txt | txt | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| budget_2003.xls | xls | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| vacation_photos | folder | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| beach_005.jpg | img | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| beach_006.jpg | img | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| beach_007.jpg | img | +5 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| michael_letter.txt | txt | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| DO_NOT_OPEN | folder | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| system_log.txt | log | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| message_for_you.txt | txt | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| minesweeper_scores.txt | txt | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |
| snake_highscore.txt | txt | +1 | First folder/file open only | components/DesktopOS/horror/filesystem.ts |


### Command Prompt / find_my_body.exe Choices
| Choice | Next node | Gain | When | Source |
| --- | --- | --- | --- | --- |
| Open Door A — MEMORIES | memories | +2 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Open Door B — SYSTEM LOGS | logs | +2 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Open Door C — [CORRUPTED] | deleted | +4 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Take the drawing. | memories_drawing | +3 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Look at the computer screen. | memories_screen | +5 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Leave quickly. | corridor_2 | +5 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Open the VISITOR_LOG drawer. | logs_visitor | +3 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Open the 2003 drawer. | logs_2003 | +4 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Open today's drawer. | logs_today | +6 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Back away slowly. | corridor_2 | +8 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Approach it. | deleted_approach | +6 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Call out to it. | deleted_call | +4 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Continue. | corridor_2 | +8 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Continue. | corridor_2 | +6 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Go through the door. | final | +5 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Press FREE. | end_free | +10 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Press CONTAIN. | end_contain | +15 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Press MERGE. | end_merge | +20 | First time per destination key | components/DesktopOS/apps/CommandPrompt.tsx |
| Run find_my_body.exe | start | +6 | First time only | components/DesktopOS/apps/CommandPrompt.tsx |


### Direct App Events
| Event | Gain | When | Source |
| --- | --- | --- | --- |
| Snake glitch-food crash | +12 | Can happen after eating glitch food in Snake | components/DesktopOS/index.tsx |
| Minesweeper win | +5 | First win only | components/DesktopOS/apps/Minesweeper.tsx |
| Snake high score | +5 | First high-score event only | components/DesktopOS/apps/Snake.tsx |


## Unlocks And Visibility Thresholds

### Hidden Items
| Item | Type | Visible at corruption | Source |
| --- | --- | --- | --- |
| beach_005.jpg | img | 25 | components/DesktopOS/horror/filesystem.ts |
| beach_006.jpg | img | 40 | components/DesktopOS/horror/filesystem.ts |
| beach_007.jpg | img | 65 | components/DesktopOS/horror/filesystem.ts |
| michael_letter.txt | txt | 999 | components/DesktopOS/horror/filesystem.ts |
| DO_NOT_OPEN | folder | 55 | components/DesktopOS/horror/filesystem.ts |
| system_log.txt | log | 50 | components/DesktopOS/horror/filesystem.ts |
| message_for_you.txt | txt | 35 | components/DesktopOS/horror/filesystem.ts |
| minesweeper_scores.txt | txt | 999 | components/DesktopOS/horror/filesystem.ts |
| snake_highscore.txt | txt | 999 | components/DesktopOS/horror/filesystem.ts |


### Locked Items
| Item | Type | Unlock/access at corruption | Source |
| --- | --- | --- | --- |
| DO_NOT_OPEN | folder | 80 | components/DesktopOS/horror/filesystem.ts |


### Notepad Corruption Appends
| File | Threshold | Effect | Source |
| --- | --- | --- | --- |
| letter_to_mom.txt | 30 | Append extra text when this file is open/rendered | components/DesktopOS/horror/filesystem.ts |
| letter_to_mom.txt | 60 | Append extra text when this file is open/rendered | components/DesktopOS/horror/filesystem.ts |
| my_diary.txt | 20 | Append extra text when this file is open/rendered | components/DesktopOS/horror/filesystem.ts |
| my_diary.txt | 45 | Append extra text when this file is open/rendered | components/DesktopOS/horror/filesystem.ts |
| my_diary.txt | 70 | Append extra text when this file is open/rendered | components/DesktopOS/horror/filesystem.ts |
| budget_2003.xls | 40 | Append extra text when this file is open/rendered | components/DesktopOS/horror/filesystem.ts |
| system_log.txt | 70 | Append extra text when this file is open/rendered | components/DesktopOS/horror/filesystem.ts |


## Display And Event Thresholds

### Login Screen Messages
| Min corruption | Greeting | Subtext | Style |
| --- | --- | --- | --- |
| 0 | Welcome. |  | normal |
| 5 | Welcome back. |  | normal |
| 15 | You are back again. |  | normal |
| 25 | Back so soon? | There is nothing new here. | normal |
| 38 | Why do you keep returning? | You should leave while you still can. | normal |
| 52 | I was hoping you wouldn't come back. | But here you are. | glitched |
| 65 | PLEASE. STOP. COMING BACK. | you don't understand what you're doing. | glitched, aggressive |
| 78 | you're just like me now. | trapped. and you don't even know it. | glitched, aggressive |
| 88 | i've been waiting. | ... | glitched, aggressive |
| 96 | there is no leaving anymore. | you know that, right? | glitched, aggressive |


### Desktop Wallpaper Ladder
| Min corruption | Wallpaper | Source |
| --- | --- | --- |
| 96 | /wallpapers/bliss_4.jpg | components/DesktopOS/Desktop.tsx |
| 78 | /wallpapers/bliss_3.jpg | components/DesktopOS/Desktop.tsx |
| 52 | /wallpapers/bliss_2.jpg | components/DesktopOS/Desktop.tsx |
| 25 | /wallpapers/bliss_1.jpg | components/DesktopOS/Desktop.tsx |
| 0 | /wallpapers/bliss_0.jpg | components/DesktopOS/Desktop.tsx |


### Desktop Jumpscare Flashes
| Threshold crossed | Effect | Gate | Source |
| --- | --- | --- | --- |
| 40 | 160ms broken-screen flash | Only when `story.canShowHardHorror` is true | components/DesktopOS/Desktop.tsx |
| 68 | 160ms broken-screen flash | Only when `story.canShowHardHorror` is true | components/DesktopOS/Desktop.tsx |
| 88 | 160ms broken-screen flash | Only when `story.canShowHardHorror` is true | components/DesktopOS/Desktop.tsx |


### Passive Horror Events
| Corruption range | Delay | Possible event |
| --- | --- | --- |
| <20 | none | no timed passive event |
| 20-29 | 2-4 minutes | Notepad message or screen glitch |
| 30-39 | 2-4 minutes | Error dialog, Notepad message, or screen glitch |
| 40-59 | 1-2 minutes | Error dialog, Notepad message, or screen glitch |
| 60-79 | 25-50 seconds | Error dialog, Notepad message, or screen glitch |
| 80-100 | 8-20 seconds | Error dialog, Notepad message, or screen glitch |

Message pools:

- <50: passive system-looking warnings.
- 50-74: active Michael/contact messages.
- >=75: desperate/aggressive messages.

Visibility-return event:

- At >=25, leaving the tab/window arms a one-time return check.
- When the user returns, a random roll decides whether a Notepad message appears. Default chance: 35%.
- If a Notepad/Error popup is already open, the return popup is skipped.
- If the user returns without first leaving, no return popup is considered.
- At >=65, that message changes to the harsher "you came back" variant.

### Cursor Corruption
| Min corruption | Cursor behavior |
| --- | --- |
| <52 | Custom ghost cursor can show, but snaps to the real cursor without lag |
| 52 | Cursor lag begins; horror GIF cursor events every ~18s + random 0-6s |
| 75 | Horror GIF interval drops to ~10s + random 0-6s |
| 90 | Horror GIF interval drops to ~5s + random 0-6s |
| 52-100 | Cursor lag lerp speed decreases toward 0.04 by corruption 100 |

### Other UI Thresholds
| Threshold | Effect |
| --- | --- |
| 25 | Desktop wallpaper changes to `bliss_1.jpg`; `beach_005.jpg` can appear |
| 35 | Recycle Bin `message_for_you.txt` can appear |
| 40 | Internet Explorer error can say "You are not supposed to leave"; `beach_006.jpg` can appear |
| 50 | `system_log.txt` desktop icon/file appears |
| 52 | Login/start UI begins visible corruption; wallpaper changes to `bliss_2.jpg`; Start Menu Internet subtitle becomes "connection established"; cursor lag/GIF system can begin |
| 60 | Notepad diary/README text gets glitched styling; Taskbar red tray dot appears; Start Menu recent documents shows "(1 item)" |
| 65 | Login becomes aggressive; Start Menu avatar turns red; MSN subtitle becomes "someone is typing..."; `beach_007.jpg` can appear |
| 68 | Desktop hard-horror jumpscare threshold |
| 70 | Late diary and system-log appends can appear |
| 75 | Passive messages switch to desperate pool |
| 78 | Chromatic overlay; wallpaper changes to `bliss_3.jpg`; Start Menu username redacts; Start Menu adds Exit item; Login "trapped" copy appears |
| 80 | `DO_NOT_OPEN` can be accessed; Command Prompt `dir` may randomly corrupt names |
| 88 | Login "i've been waiting" copy; desktop hard-horror jumpscare threshold |
| 90 | Cursor GIF interval becomes fastest |
| 96 | Final login message and `bliss_4.jpg` wallpaper |

## Hard-Horror Gates

- Desktop jumpscare flashes require both crossing one of `40, 68, 88` and `story.canShowHardHorror`.
- Snake glitch-food crash overlay/audio adds corruption immediately, but it only becomes part of the breach/hard-horror path after story state allows it.
- The beach_007 close trap only runs when `story.canShowHardHorror` is true.
- Possession/logoff cursor control only starts when `story.canShowHardHorror` is true.
- Shutdown safe-to-close text rewrite only runs when `story.canShowHorror` is true.

## Source Appendix

Watched source files:

- `components/DesktopOS/horror/filesystem.ts`
- `components/DesktopOS/apps/CommandPrompt.tsx`
- `components/DesktopOS/Desktop.tsx`
- `components/DesktopOS/index.tsx`
- `components/DesktopOS/horror/useHorrorEvents.ts`
- `hooks/useCorruptedCursor.ts`
- `components/LoginScreen/index.tsx`
- `components/DesktopOS/StartMenu.tsx`
- `components/DesktopOS/Taskbar.tsx`
- `components/DesktopOS/apps/Notepad.tsx`
- `components/DesktopOS/apps/ErrorDialog.tsx`
- `components/DesktopOS/apps/Minesweeper.tsx`
- `components/DesktopOS/apps/Snake.tsx`
- `hooks/useStoryState.ts`
- `components/DesktopOS/SafeToCloseScreen.tsx`
