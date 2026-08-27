# Team Cards

Creates a grid of cards designed for displaying team members with photos, names, and job titles.

## When to Use

- "Meet the Team" pages
- Staff directories
- Department or group member listings
- Any content featuring people with photos and titles

## Authoring

### Basic Structure

| team-cards |                  |
|------------|------------------|
| photo1.jpg | Name, Job Title  |
| photo2.jpg | Name, Job Title  |

### With Section Title

Add a single-cell row at the top to create a section title:

| team-cards            |                  |
|-----------------------|------------------|
| Acme Spark Team   |
| photo1.jpg            | Name, Job Title  |
| photo2.jpg            | Name, Job Title  |

### Content Structure

| Row Type | First Column | Second Column |
|----------|--------------|---------------|
| Title (optional) | Section title | Empty |
| Team member | Photo | Name and job title |

Each team member uses one row with:
- **First column:** Team member photo
- **Second column:** Name (as heading) and job title (as paragraph)

## Examples

### Simple Team Grid

![team-cards-1.png](..%2Fimages%2Fteam-cards-1.png)

### Team Section with Title

![team-cards-2.png](..%2Fimages%2Fteam-cards-2.png)


## Live Examples

- Meet the Team page: [da.live/edit#/.../help/meet-the-team](https://da.live/edit#/aem-showcase/assethub-spark/en/help/meet-the-team)

## Tips

- Use square or near-square photos for best results
- Keep job titles concise (1-2 lines)
- Use consistent photo styles (background, lighting, cropping)
- Photos are automatically optimized for web delivery
- Add a title row to create a labeled section
- Consider grouping large teams into multiple team-cards blocks by department


## Related

- [Cards](cards.md) - For general content cards
