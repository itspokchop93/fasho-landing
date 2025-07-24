# CRITICAL MEMORY: ALWAYS USE CSS CLASSES FOR DESIGN CHANGES

## THE PROBLEM
When making design changes (margins, padding, colors, sizes, etc.), using client-side JavaScript like:
```javascript
style={{ marginTop: typeof window !== 'undefined' && window.innerWidth >= 768 ? '50px' : '0px' }}
```

**CAUSES REFRESH ISSUES** because:
1. JavaScript only runs after page load
2. On refresh, there's a brief moment where JS hasn't executed
3. Changes disappear and revert to defaults
4. User sees inconsistent behavior

## THE SOLUTION: ALWAYS USE CSS CLASSES
Instead of client-side JavaScript, use Tailwind CSS classes:

**❌ WRONG (disappears on refresh):**
```jsx
style={{ marginTop: typeof window !== 'undefined' && window.innerWidth >= 768 ? '50px' : '0px' }}
```

**✅ CORRECT (persists through refresh):**
```jsx
className="sm:mt-[50px]"
```

## CSS CLASS PATTERNS TO USE
- **Responsive margins:** `sm:mt-[50px]`, `md:pt-8`, `lg:mb-12`
- **Responsive padding:** `sm:px-6`, `md:py-4`, `lg:p-8`
- **Responsive sizing:** `sm:w-64`, `md:h-96`, `lg:text-xl`
- **Responsive colors:** `sm:bg-blue-500`, `md:text-white`
- **Responsive positioning:** `sm:relative`, `md:absolute`, `lg:fixed`

## BREAKPOINTS
- `sm:` = 640px+
- `md:` = 768px+
- `lg:` = 1024px+
- `xl:` = 1280px+
- `2xl:` = 1536px+

## CRITICAL RULE
**NEVER use client-side JavaScript for design changes that need to persist through page refreshes. ALWAYS use CSS classes.**

## WHY THIS MATTERS
- CSS classes are applied immediately by the browser
- No JavaScript dependency
- Consistent behavior across refreshes
- Better performance
- More reliable user experience

## WHEN TO USE INLINE STYLES
Only use inline styles for:
- Dynamic values that change based on user interaction
- Complex calculations that can't be done with CSS
- Third-party component overrides
- Animation values that change during runtime

**NEVER for static responsive design changes.** 