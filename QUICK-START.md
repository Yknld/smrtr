# Quick Start Guide - Adding Your Lecture Content

Yes, this is a **template**! All you need to do is provide your lecture data as JSON. The template automatically generates everything else.

## How It Works

1. **Provide JSON data** → 2. **Template renders everything** → 3. **Done!**

No HTML editing needed. No CSS changes required. Just update the JSON.

## Three Ways to Add Your Data

### Method 1: Replace `sample-data.json` (Easiest for Testing)

Just edit `sample-data.json` with your lecture content:

```json
{
  "lecture": {
    "title": "Your Lecture Title",
    "number": 1,
    "totalLectures": 5
  },
  "notes": {
    "keyTakeaways": ["Your takeaway 1", "Your takeaway 2"]
  }
  // ... rest of your data
}
```

### Method 2: Inject from Backend (Production)

In your backend, generate the JSON and inject it:

```html
<!-- In your server-side template -->
<script>
  window.__LECTURE_DATA__ = <?php echo json_encode($lectureData); ?>;
  // or in Node.js/Express:
  // window.__LECTURE_DATA__ = <%- JSON.stringify(lectureData) %>;
</script>
<script src="app.js"></script>
```

### Method 3: Load from API

```html
<script>
  fetch('/api/lectures/123')
    .then(r => r.json())
    .then(data => {
      window.__LECTURE_DATA__ = data;
    });
</script>
<script src="app.js"></script>
```

## Minimal Example

Here's the **absolute minimum** you need to get started:

```json
{
  "course": {
    "pathBreadcrumbs": ["Home", "My Course", "Lecture 1"]
  },
  "lecture": {
    "title": "Introduction to My Topic",
    "number": 1,
    "totalLectures": 10,
    "rating": 4.5
  },
  "notes": {
    "keyTakeaways": [
      "First important point",
      "Second important point"
    ]
  },
  "quiz": {
    "question": "What did you learn?",
    "options": [
      {"id": "A", "text": "Option A"},
      {"id": "B", "text": "Option B"}
    ],
    "answerId": "A",
    "explanation": "Because..."
  }
}
```

That's it! The template will:
- ✅ Generate the hero section with title and breadcrumbs
- ✅ Create the notes section with key takeaways
- ✅ Build the quiz with all options
- ✅ Style everything automatically
- ✅ Add all interactive features

## What Gets Auto-Generated

When you provide JSON, the template automatically creates:

| Your JSON Field | → | Generated UI Element |
|----------------|---|---------------------|
| `lecture.title` | → | Large hero title |
| `lecture.rating` | → | Star rating display |
| `notes.keyTakeaways` | → | "What You'll Learn" checklist |
| `notes.concepts[]` | → | Collapsible concept cards |
| `quiz.question` + `quiz.options[]` | → | Full quiz with submit button |
| `wrapUp.summaryBullets[]` | → | Summary section |
| `diagram.labels[]` | → | Interactive diagram controls |

## Optional Fields

Most fields are optional! If you don't provide:
- `video.videoUrl` → Shows placeholder
- `diagram` → Shows default diagram
- `wrapUp` → Section just won't show
- `quiz` → Quiz section won't appear

The template gracefully handles missing data.

## Example: Adding a New Lecture

**Step 1:** Create your JSON file (e.g., `lecture-2.json`):

```json
{
  "lecture": {
    "title": "Advanced Concepts",
    "number": 2,
    "totalLectures": 10
  },
  "notes": {
    "keyTakeaways": ["Advanced point 1", "Advanced point 2"],
    "concepts": [
      {
        "title": "Advanced Topic",
        "plainExplanation": "This is an advanced concept...",
        "bullets": ["Detail 1", "Detail 2"]
      }
    ]
  }
}
```

**Step 2:** Load it:

```html
<script>
  fetch('lecture-2.json')
    .then(r => r.json())
    .then(data => {
      window.__LECTURE_DATA__ = data;
    });
</script>
```

**Step 3:** Done! The entire page is generated.

## Backend Integration Example

### PHP Example
```php
<?php
$lectureData = [
    'lecture' => [
        'title' => $lecture->title,
        'number' => $lecture->number,
        'totalLectures' => $lecture->course->total_lectures,
        'rating' => $lecture->average_rating
    ],
    'notes' => [
        'keyTakeaways' => $lecture->getKeyTakeaways(),
        'concepts' => $lecture->getConcepts()
    ],
    'quiz' => [
        'question' => $lecture->quiz->question,
        'options' => $lecture->quiz->options,
        'answerId' => $lecture->quiz->correct_answer
    ]
];
?>
<script>
  window.__LECTURE_DATA__ = <?php echo json_encode($lectureData); ?>;
</script>
```

### Node.js/Express Example
```javascript
app.get('/lecture/:id', (req, res) => {
  const lecture = getLectureById(req.params.id);
  res.render('lecture-template', {
    lectureData: JSON.stringify(lecture)
  });
});
```

```html
<!-- In your template -->
<script>
  window.__LECTURE_DATA__ = <%- lectureData %>;
</script>
```

## That's It!

The template handles:
- ✅ All HTML generation
- ✅ All styling (dark mode, cards, animations)
- ✅ All interactivity (quiz, collapsible cards, smooth scroll)
- ✅ Progress tracking
- ✅ Mobile responsiveness

You just provide the data! 🎉
