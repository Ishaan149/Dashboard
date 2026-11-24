# Dashboard design guide

## Page frame

- Run a slim header across the top with the dashboard mark on the left and page actions on the right. Below it, align the sidebar and the first content panel to the same top edge.
- Use **24 px outer gutters** and a **16 px gap** between the sidebar and content. Below **768 px**, use 16 px gutters and leave room below the last item for bottom navigation.

## Shared sidebar

- Use the same sidebar on every page. Keep destinations in a fixed order, anchor Settings at the bottom, and update the active state as you navigate.
- At **1024 px and up**, use a **256 px inset panel** with a charcoal fill, a 1 px border, and 24 px corners. Use 44 px rows with icons and visible labels. Mark the active page with a near-black pill, a bright label, and an accent icon.
- From **768 to 1023 px**, use a compact icon rail with tooltips and accessible labels. Below **768 px**, put workspace destinations in the bottom bar and Settings in the header menu.

## Cards and spacing

- Use a **16 px gap** between cards. For an overview, try a **2:1:1** lead row with one wide card and two smaller summaries of equal height. Give timelines, boards, and long lists the width they need. Stack cards in reading order on narrow screens.
- Use **24 px card corners**, **24 px padding** on desktop, and **16 px padding** on phones. Use 8 px between related elements. For lists, put multiple rows in one card with 12–16 px vertical padding per row and 1 px dividers between rows.
- Use Hanken Grotesk. Start with **32–40 px page titles**, **18–20 px card titles**, **14–16 px body text**, and **48–64 px** for featured counts. Use sentence case for labels and tabular numerals for times and counts.

## Color and controls

- Start with `#0B0B0D` for the canvas, `#151517` for solid surfaces, and `#28282D` for borders. Use `#F7F7FA` for primary text and `#A0A0AD` for secondary text. Let surface changes and borders define the card edges.
- Use bold, solid fills for the one or two things that deserve first attention on a screen. Try lime `#C5F45F` for a task count, lavender `#C6AFFA` for habit progress, blue `#78ACFF` for applications, or coral and amber for other highlights. Pick accents by what the page needs to emphasize and use each consistently within the view. Pair bright fills with near-black text.
- Use filled pills for short actions and meaningful statuses, and 12 px corners on inputs. Give controls a visible keyboard focus ring and pair status colors with a label or icon.
