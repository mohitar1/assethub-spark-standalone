# Images and Media

This guide covers how to add and optimize images in your Spark pages.

## Adding Images

### In Default Content

Simply insert an image into your document where you want it to appear:

1. Place your cursor in the document
2. Insert an image (drag and drop, or use the insert menu)
3. The image appears inline with your content

### In Blocks

Most blocks accept images in specific cells. Refer to each block's documentation for image placement:

- **Cards** - First column contains the image
- **Carousel** - First column contains the image
- **Team Cards** - First column contains the photo

## Image Optimization

Images are automatically optimized when your page is published:

| Optimization | What Happens |
|--------------|--------------|
| Format | Converted to WebP for modern browsers (with fallback) |
| Sizing | Multiple sizes generated for different screen widths |
| Loading | Lazy loading applied (images load as user scrolls) |
| Quality | Optimized for web delivery |

You don't need to manually resize or compress images - the system handles this automatically.

## Alt Text

Alt text (alternative text) describes images for:
- Screen readers (accessibility)
- Search engines (SEO)
- Fallback when images fail to load

### Adding Alt Text

In Document Authoring, alt text is typically set through the image properties or by adding a caption.


### File Formats

| Format | Best For |
|--------|----------|
| JPG/JPEG | Photos, complex images |
| PNG | Graphics with transparency |
| SVG | Icons, logos (vector) |
| WebP | Automatically generated |

> **Note:** Upload JPG or PNG files. The system automatically creates WebP versions for browsers that support it.

### File Size

- Keep original files under 5MB for faster uploads
- The system optimizes files, but starting smaller helps
- Very large files may slow down the authoring experience

## Icons

Icons are handled separately from regular images. They're stored in the `/icons/` folder and referenced by name.

To use an icon inline, you typically use a special syntax depending on the context. Most icons are added automatically by blocks (like the info icon in Note blocks).

## Background Images

Sections can have background images using Section Metadata:

| Section Metadata |  |
|------------------|--|
| Background image | your-image.jpg |

The image will cover the entire section background.

## Image Best Practices

### Do

- **Use high-quality source images** - Optimization works best with good originals
- **Add meaningful alt text** - Improves accessibility and SEO
- **Use consistent aspect ratios** - Especially in grids (Cards, Carousel)
- **Test on mobile** - Ensure images look good on small screens
- **Use appropriate file formats** - JPG for photos, PNG for graphics

### Don't

- **Don't use text in images** - Text should be actual text for accessibility
- **Don't upload huge files unnecessarily** - Keep under 5MB when possible
- **Don't skip alt text** - Every meaningful image needs a description
- **Don't use images for layout** - Use blocks and sections instead
- **Don't hotlink external images** - Upload images to Document Authoring

## Troubleshooting

### Image Not Displaying

1. **Check the file** - Ensure it uploaded successfully
2. **Preview the page** - Images may not show in edit mode
3. **Check file format** - Use JPG, PNG, or WebP
4. **Verify placement** - Ensure image is in the correct cell for blocks

### Image Looks Blurry

1. **Check source resolution** - Original may be too small
2. **Upload a larger version** - At least 750px wide for most uses
3. **Check the block** - Some blocks have specific size requirements

### Image Too Large/Small

- Images automatically scale to fit their container
- For specific sizing, work with your development team
- Most blocks handle sizing automatically

## Related

- [Cards](blocks/cards.md) - Using images in card layouts
- [Carousel](blocks/carousel.md) - Using images in carousels
- [Team Cards](blocks/team-cards.md) - Using photos for team members
- [Page Structure](page-structure.md) - Background images in sections
