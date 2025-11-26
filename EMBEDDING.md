# Embedding NPM Package Score Widget

## Usage

Add this to your GitHub README.md:

```markdown
![NPM Score](https://your-domain.com/api/badge?package=your-package-name)
```

Or as a clickable link:

```markdown
[![NPM Score](https://your-domain.com/api/badge?package=your-package-name)](https://your-domain.com/?package=your-package-name)
```

## Examples

For the package `react`:

```markdown
[![NPM Score](https://your-domain.com/api/badge?package=react)](https://your-domain.com/?package=react)
```

For the package `express`:

```markdown
[![NPM Score](https://your-domain.com/api/badge?package=express)](https://your-domain.com/?package=express)
```

## Widget Display

The widget shows:
- Large circle on the left: Total package score
- Smaller circles: Individual pillar scores (Quality, Popularity, Maintenance)
- Color-coded scores matching the main app:
  - 🟢 Green (75-100): Excellent
  - 🟠 Orange (50-74): Good
  - 🔴 Red (0-49): Needs improvement

## Notes

- Widgets are cached for 1 hour
- Replace `your-domain.com` with your actual deployment URL
- Dark theme matches the main application
- Horizontal layout fits well in README files
