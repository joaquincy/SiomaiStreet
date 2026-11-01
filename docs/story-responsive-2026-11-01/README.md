# Story section mobile spacing

Scope: `AboutUs.jsx` and `AboutUs.css` only. Existing copy, assets, colors, font families, card treatments and desktop composition remain. Other pre-existing working-tree changes were not edited.

On screens up to 768px, and short landscape screens up to 1024px wide / 500px tall, the story uses content-sized grid rows instead of a fixed viewport-sized sticky stage. Title, artwork, founder introduction and card/description have separate space. Side gutters, text wrapping, readable responsive sizes and a 44px minimum card-button height keep content usable on phones. The existing red background follows the opening rows. An 88px anchor offset clears the floating navigation.

The desktop animation is disabled only while the mobile layout applies, avoiding hidden content and stale animated offsets. Rotation/breakpoint changes clean up and restore the animation listeners. No content or new features were added.

Verification:
- Browser layout measurements at 320×568, 360×740, 390×844, 430×932, 768×1024, 844×390, 1024×768 and 1440×900: measured story groups stayed within horizontal viewport bounds.
- 320px: no internal text/container horizontal overflow in the responsive story.
- Desktop-to-phone resize: founder text, card and description remained visible; larger screens retained the sticky layout.
- Inspected 390px opening and founder views, including the next-section boundary. `390-story.jpg` shows the complete mobile composition.
- Production build and targeted lint pass. These are browser viewport checks, not real-device certification.

The founder photo and description placeholders and existing button behavior are preserved as requested; this task changes responsive layout only.
