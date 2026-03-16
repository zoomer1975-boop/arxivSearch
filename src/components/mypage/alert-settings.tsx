'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AlertSettingsProps {
  initialSettings: {
    alertMethod: string
    telegramChatId: string | null
    alertTime: string
  }
}

export function AlertSettings({ initialSettings }: AlertSettingsProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')

    const res = await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      const data = await res.json()
      setError((data as { error: string }).error ?? 'Failed to save settings')
    }
  }

  const showTelegram =
    settings.alertMethod === 'TELEGRAM' || settings.alertMethod === 'BOTH'

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label>Alert Method</Label>
        <Select
          value={settings.alertMethod}
          onValueChange={v => setSettings(s => ({ ...s, alertMethod: v }))}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EMAIL">Email only</SelectItem>
            <SelectItem value="TELEGRAM">Telegram only</SelectItem>
            <SelectItem value="BOTH">Both</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showTelegram && (
        <div className="space-y-2">
          <Label>Telegram Chat ID</Label>
          <Input
            value={settings.telegramChatId ?? ''}
            onChange={e =>
              setSettings(s => ({
                ...s,
                telegramChatId: e.target.value || null,
              }))
            }
            placeholder="e.g. 123456789"
            className="w-48"
          />
          <p className="text-xs text-gray-500">
            Send /start to your bot, then message{' '}
            <code className="bg-gray-100 px-1 rounded">@userinfobot</code> to
            get your chat ID.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Daily Alert Time (KST)</Label>
        <Input
          type="time"
          value={settings.alertTime}
          onChange={e => setSettings(s => ({ ...s, alertTime: e.target.value }))}
          className="w-32"
        />
        <p className="text-xs text-gray-500">
          Papers matching your interests will be sent at this time daily.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}
