'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const CATEGORY_GROUPS = [
  {
    label: 'Computer Science',
    categories: [
      { value: 'cs.AI', label: 'Artificial Intelligence' },
      { value: 'cs.LG', label: 'Machine Learning' },
      { value: 'cs.CL', label: 'Computation & Language' },
      { value: 'cs.CV', label: 'Computer Vision' },
      { value: 'cs.CR', label: 'Cryptography & Security' },
      { value: 'cs.NE', label: 'Neural & Evolutionary Computing' },
      { value: 'cs.RO', label: 'Robotics' },
      { value: 'cs.SE', label: 'Software Engineering' },
    ],
  },
  {
    label: 'Mathematics',
    categories: [
      { value: 'math.CO', label: 'Combinatorics' },
      { value: 'math.ST', label: 'Statistics Theory' },
      { value: 'math.OC', label: 'Optimization & Control' },
      { value: 'math.PR', label: 'Probability' },
      { value: 'math.NA', label: 'Numerical Analysis' },
    ],
  },
  {
    label: 'Physics',
    categories: [
      { value: 'physics.comp-ph', label: 'Computational Physics' },
      { value: 'hep-th', label: 'High Energy Physics - Theory' },
      { value: 'quant-ph', label: 'Quantum Physics' },
      { value: 'cond-mat.mes-hall', label: 'Mesoscale & Nanoscale Physics' },
    ],
  },
  {
    label: 'Statistics',
    categories: [
      { value: 'stat.ML', label: 'Machine Learning' },
      { value: 'stat.TH', label: 'Statistics Theory' },
      { value: 'stat.ME', label: 'Methodology' },
    ],
  },
  {
    label: 'Other',
    categories: [
      { value: 'eess.IV', label: 'Image & Video Processing' },
      { value: 'econ.GN', label: 'General Economics' },
      { value: 'q-bio.NC', label: 'Neurons & Cognition' },
      { value: 'q-fin.CP', label: 'Computational Finance' },
    ],
  },
]

interface CategorySelectorProps {
  initialSelected: string[]
  onSave: (categories: string[]) => Promise<void>
}

export function CategorySelector({ initialSelected, onSave }: CategorySelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['Computer Science']))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(cat: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function toggleGroup(label: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    await onSave(Array.from(selected))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3">
      {CATEGORY_GROUPS.map(group => (
        <div key={group.label} className="border rounded-lg">
          <button
            type="button"
            className="flex items-center justify-between w-full px-4 py-3 font-medium text-sm hover:bg-gray-50 rounded-lg"
            onClick={() => toggleGroup(group.label)}
          >
            <span>{group.label}</span>
            <span className="text-gray-400 text-xs">
              {group.categories.filter(c => selected.has(c.value)).length}/{group.categories.length}
              {' '}
              {expanded.has(group.label) ? '▲' : '▼'}
            </span>
          </button>
          {expanded.has(group.label) && (
            <div className="px-4 pb-3 grid grid-cols-2 gap-2 border-t pt-3">
              {group.categories.map(cat => (
                <div key={cat.value} className="flex items-center gap-2">
                  <Checkbox
                    id={cat.value}
                    checked={selected.has(cat.value)}
                    onCheckedChange={() => toggle(cat.value)}
                  />
                  <Label htmlFor={cat.value} className="text-sm cursor-pointer font-normal">
                    <span className="text-gray-800">{cat.label}</span>
                    <span className="text-gray-400 text-xs ml-1">({cat.value})</span>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center gap-4 pt-2">
        <span className="text-sm text-gray-500">{selected.size} categories selected</span>
        <Button onClick={handleSave} disabled={saving}>
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Categories'}
        </Button>
      </div>
    </div>
  )
}
