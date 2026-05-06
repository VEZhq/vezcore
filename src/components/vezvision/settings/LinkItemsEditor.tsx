'use client'

import { Plus, Trash2 } from 'lucide-react'
import { VVLocalizedLinkItem } from '@/lib/actions/vezvision/types'
import { inputCls, iconButtonCls, buttonCls } from './settingsStyles'
import { cloneLink } from './settingsHelpers'

interface LinkItemsEditorProps {
  items: VVLocalizedLinkItem[]
  onChange: (items: VVLocalizedLinkItem[]) => void
  disabled: boolean
  addLabel: string
}

export function LinkItemsEditor({
  items,
  onChange,
  disabled,
  addLabel,
}: LinkItemsEditorProps) {
  const updateItem = (index: number, patch: Partial<VVLocalizedLinkItem>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index))
  }

  const addItem = () => {
    onChange([...items, cloneLink()])
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id} className="grid grid-cols-1 gap-3 rounded-md border border-white/[0.06] light:border-black/[0.06] p-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
          <input value={item.labelPl} onChange={(event) => updateItem(index, { labelPl: event.target.value })} className={inputCls} placeholder="Label PL" disabled={disabled} />
          <input value={item.labelEn} onChange={(event) => updateItem(index, { labelEn: event.target.value })} className={inputCls} placeholder="Label EN" disabled={disabled} />
          <input value={item.href} onChange={(event) => updateItem(index, { href: event.target.value })} className={inputCls} placeholder="/contact lub https://..." disabled={disabled} />
          <button type="button" onClick={() => updateItem(index, { enabled: !item.enabled })} className={iconButtonCls} disabled={disabled} title="Przełącz aktywność">
            <span className={`text-[10px] uppercase tracking-[0.2em] ${item.enabled ? 'text-emerald-300 light:text-emerald-600' : ''}`}>{item.enabled ? 'On' : 'Off'}</span>
          </button>
          <button type="button" onClick={() => removeItem(index)} className={iconButtonCls} disabled={disabled} title="Usuń link">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button type="button" onClick={addItem} className={buttonCls} disabled={disabled}>
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  )
}
