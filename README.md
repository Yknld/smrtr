# Lecture Template - Single Page HTML Template

A premium, dark-mode single-page HTML template for mini-course/lecture pages. Built with vanilla HTML, CSS, and JavaScript - no frameworks or external dependencies required.

## Features

- **Dark Mode Premium Design**: Clean, spacious layout with soft glow effects
- **Scroll-Driven Sections**: Each section represents a chapter that scrolls smoothly
- **Sticky Navigation**: 
  - Top progress bar showing scroll percentage
  - Left vertical mini-navigation (desktop) highlighting current section
- **Responsive Design**: Mobile-friendly with stacked layout
- **Interactive Elements**:
  - Collapsible concept cards
  - Quiz with feedback and history
  - Smooth scroll navigation
- **JSON-Driven Content**: All content populated from `window.__LECTURE_DATA__`

## File Structure

```
lecture-template/
├── index.html          # Main HTML structure
├── styles.css          # All styling (dark mode, premium design)
├── app.js              # Rendering logic and interactivity
├── sample-data.json    # Sample JSON data structure
└── README.md           # This file
```

## Quick Start

### Option 1: Using Sample Data (Development)

Simply open `index.html` in a browser. The page will automatically load `sample-data.json` if `window.__LECTURE_DATA__` is not already set.

### Option 2: Injecting Data from Backend

Set `window.__LECTURE_DATA__` before the page loads:

```html
<script>
    window.__LECTURE_DATA__ = {
        // Your lecture data here
    };
</script>
<script src="app.js"></script>
```

Or load from an API:

```html
<script>
    fetch('/api/lecture/123')
        .then(response => response.json())
        .then(data => {
            window.__LECTURE_DATA__ = data;
        });
</script>
<script src="app.js"></script>
```

## Data Structure

The template expects `window.__LECTURE_DATA__` with top-level keys: `course`, `lecture`, `video`, `notes`, `diagram`, `quiz`, `wrapUp`. See `docs/` or the template source for the full schema.

## Sections

The template includes 6 main sections:

1. **Section 0: Hero/Header** - Course name, lecture title, breadcrumbs, rating, lecture number
2. **Section 1: Video & Animation** - Video player (left) + "What You'll Learn" checklist (right)
3. **Section 2: Lecture Notes** - Key Takeaways + collapsible Core Concepts cards
4. **Section 3: Interactive Diagram** - Diagram visualization with controls panel
5. **Section 4: Quiz** - Multiple choice quiz with feedback
6. **Section 5: Wrap Up** - Summary, next steps, and CTA buttons

## Data Slots

The template uses `data-slot` attributes for easy content injection:

- `data-slot="breadcrumbs"` - Breadcrumb navigation
- `data-slot="lectureTitle"` - Lecture title
- `data-slot="rating"` - Star rating
- `data-slot="lectureInfo"` - Lecture number info
- `data-slot="lectureDescription"` - Lecture description
- `data-slot="video"` - Video player
- `data-slot="checkpoint"` - What you'll learn checklist
- `data-slot="notes"` - Lecture notes container
- `data-slot="diagram"` - Diagram visualization
- `data-slot="diagramControls"` - Diagram controls panel
- `data-slot="tryItInstructions"` - Try it instructions
- `data-slot="quiz"` - Quiz container
- `data-slot="wrapUp"` - Wrap up content

## Features Explained

### Progress Bar
The top progress bar automatically updates as you scroll through the page, showing the percentage of content viewed.

### Mini Navigation
The left vertical navigation highlights the current section using IntersectionObserver. It's hidden on mobile devices.

### Collapsible Cards
Concept cards in the Lecture Notes section can be expanded/collapsed by clicking the header.

### Quiz System
- Select an option and click Submit
- Correct/incorrect feedback is shown
- Quiz attempts are saved to localStorage with timestamps
- Review quiz history button shows all previous attempts

### Smooth Scrolling
"Continue" buttons at the end of each section smoothly scroll to the next section.

## Hosting on GitHub Pages

1. Push your files to a GitHub repository
2. Go to repository Settings → Pages
3. Select the branch and folder containing your files
4. Your site will be available at `https://username.github.io/repository-name/lecture-template/`

### Important Notes for GitHub Pages:
- Make sure all file paths are relative (they already are)
- The `sample-data.json` will be loaded automatically if `window.__LECTURE_DATA__` is not set
- For production, inject `window.__LECTURE_DATA__` from your backend API

## Customization

### Colors
Edit CSS variables in `styles.css`:

```css
:root {
    --bg-primary: #0a0a0f;
    --accent-blue: #4a9eff;
    --accent-yellow: #ffd700;
    /* ... */
}
```

### Fonts
The template uses system fonts. To change, modify the `font-family` in `body` selector in `styles.css`.

### Section Order
Sections are defined in `index.html` with IDs `section-0` through `section-5`. Reorder them as needed, but update the mini-navigation accordingly.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Uses IntersectionObserver API (supported in all modern browsers)

## License

This template is provided as-is for use in your projects.
