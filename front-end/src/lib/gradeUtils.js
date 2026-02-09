// gradeUtils.js - Helpers for grade/included logic

/**
 * Extract base component name for grouping (e.g. "Pre-Lab Quiz 1" -> "Pre-Lab Quiz").
 */
export function getComponentBase(name) {
  if (!name || typeof name !== 'string') return String(name || '')
  return name
    .replace(/\s*\(opt\)?\s*$/i, '')
    .replace(/\s*\(optional\)?\s*$/i, '')
    .trim()
    .replace(/\s+#?\d+\s*$/, '')
    .trim() || name
}

/**
 * Returns a Set of indices (for AddPage) or ids (for CoursePage) where the checkbox can be toggled.
 * Items in a multi-item group (same component base, e.g. Quiz 1–4) can always toggle—
 * typical "best N of M" scenario. Single-item groups (Midterm, Final) cannot toggle.
 * @param {Array<{name: string, included?: boolean, id?: number}>} items
 * @param {boolean} useId - if true, use item.id for the set; else use index
 */
export function getOptionalGroupToggleable(items, useId = false) {
  const toggleable = new Set()
  if (!items?.length) return toggleable

  // Group by component base
  const byComponent = new Map()
  items.forEach((item, idx) => {
    const base = getComponentBase(item.name)
    if (!byComponent.has(base)) byComponent.set(base, [])
    byComponent.get(base).push({ item, idx })
  })

  // For each group with 2+ items: all can toggle (best N of M)
  byComponent.forEach((group) => {
    if (group.length > 1) {
      group.forEach(({ item, idx }) => {
        toggleable.add(useId ? item.id : idx)
      })
    }
  })

  return toggleable
}

/**
 * Returns a Map of group base -> max allowed included count for "best N of M" groups.
 * Only groups with at least one included=false are considered (optional groups).
 * Max = count of items that should be included (N in "best N of M").
 * @param {Array<{name: string, included?: boolean}>} items
 * @returns {Map<string, number>}
 */
export function getGroupMaxIncluded(items) {
  const maxByGroup = new Map()
  if (!items?.length) return maxByGroup

  const byComponent = new Map()
  items.forEach((item) => {
    const base = getComponentBase(item.name)
    if (!byComponent.has(base)) byComponent.set(base, [])
    byComponent.get(base).push(item)
  })

  byComponent.forEach((group, base) => {
    const hasOptional = group.some((item) => item.included === false)
    if (hasOptional && group.length > 1) {
      const nIncluded = group.filter((item) => item.included !== false).length
      maxByGroup.set(base, nIncluded)
    }
  })

  return maxByGroup
}
