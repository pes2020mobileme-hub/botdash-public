import { useState } from 'react'
import {
  Server,
  Hammer,
  Hash,
  Volume2,
  Megaphone,
  MessageSquare,
  Trash2,
  Plus,
  FolderPlus,
  Shield,
  CheckSquare,
  Square,
  AlertTriangle,
  Zap,
  Layers,
} from 'lucide-react'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

const CHANNEL_ICON = {
  text: Hash,
  voice: Volume2,
  stage: Volume2,
  announcement: Megaphone,
  forum: MessageSquare,
}

const CHANNEL_LABEL = {
  text: 'ข้อความ',
  voice: 'เสียง',
  stage: 'เวที',
  announcement: 'ประกาศ',
  forum: 'ฟอรัม',
}

export default function Builder() {
  const guilds = useApi(() => api.servers(), [], 30000)
  const [guildId, setGuildId] = useState('')

  if (guilds.error) return <div className="card empty">{guilds.error.message}</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Server Builder</h1>
          <p>สร้าง/ลบห้อง หมวดหมู่ และโรลในเซิร์ฟเวอร์ที่บอทอยู่</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          เลือกเซิร์ฟเวอร์
        </label>
        <select value={guildId} onChange={(e) => setGuildId(e.target.value)} style={{ width: '100%', maxWidth: 420 }}>
          <option value="">— เลือกเซิร์ฟเวอร์ —</option>
          {guilds.data?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.id})
            </option>
          ))}
        </select>
      </div>

      {guildId ? <Workspace guildId={guildId} /> : <div className="card empty">เลือกเซิร์ฟเวอร์ด้านบนก่อน</div>}
    </div>
  )
}

function Workspace({ guildId }) {
  const structure = useApi(() => api.structure(guildId), [guildId], 30000)

  if (structure.loading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ height: 18, width: 180, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    )
  }

  if (structure.error) {
    return (
      <div className="card empty" style={{ color: 'var(--danger)' }}>
        {structure.error.message}
      </div>
    )
  }

  const data = structure.data
  const perms = data.permissions
  const canManage = perms?.administrator || perms?.manageChannels

  return (
    <>
      {perms && !canManage && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(248,113,113,.35)' }}>
          <div className="row" style={{ alignItems: 'center' }}>
            <AlertTriangle size={18} color="var(--danger)" />
            <div>
              <div style={{ fontWeight: 600 }}>บอทไม่มีสิทธิ์ Manage Channels</div>
              <div className="dim" style={{ fontSize: '0.87rem' }}>
                เปิดหน้า Server Settings → Roles → เลือกบอท → เปิดสิทธิ์ Manage Channels และ Manage Roles
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="split" style={{ marginBottom: 20 }}>
        <TemplatePanel guildId={guildId} disabled={!canManage} onDone={structure.reload} />
        <QuickCreate guildId={guildId} disabled={!canManage} onDone={structure.reload} />
      </div>

      <ManagePanel guildId={guildId} data={data} onDone={structure.reload} />
    </>
  )
}

function TemplatePanel({ guildId, disabled, onDone }) {
  const { data, loading, reload } = useApi(() => api.templates(), [])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  async function apply(templateId, name) {
    if (!window.confirm(`สร้างโครงสร้าง "${name}" ในเซิร์ฟเวอร์นี้?\n\nระบบจะสร้างเพิ่มโดยไม่ลบของเดิม`)) return

    setBusy(true)
    setResult(null)
    try {
      const report = await api.applyTemplate(guildId, templateId)
      setResult(report)
      onDone()
      reload()
    } catch (error) {
      setResult({ error: error.message })
    } finally {
      setBusy(false)
    }
  }

  const totalChannels = (t) => t.categories.reduce((sum, c) => sum + (c.channels?.length ?? 0), 0)

  return (
    <div className="card">
      <h3 className="card-title">
        <Layers size={17} color="var(--g2)" /> ใช้ Template
      </h3>
      <p className="form-hint">
        สร้างหมวดหมู่ + ห้อง + โรลตามชุด ตอนนี้เลือกได้ทีละเซิร์ฟเวอร์ ระบบจะไม่ลบของเดิม
      </p>

      {loading && <div className="skeleton" style={{ height: 90 }} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data?.templates.map((t) => (
          <div
            key={t.id}
            className="server-row"
            style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 14px' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{t.name}</div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                {t.description} · หมวด {t.categories.length} · ห้อง {totalChannels(t)} · โรล {t.roles?.length ?? 0}
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              disabled={disabled || busy}
              onClick={() => apply(t.id, t.name)}
            >
              <Zap size={13} /> {busy ? 'กำลังสร้าง...' : 'ใช้'}
            </button>
          </div>
        ))}
      </div>

      {result && (
        <div className={result.error ? 'badge badge-danger' : 'badge badge-success'} style={{ marginTop: 14 }}>
          {result.error ??
            `สร้างแล้ว: หมวดหมู่ ${result.categories.length} · ห้อง ${result.channels.length} · โรล ${result.roles.length}` +
            (result.failed.length ? ` · พัง ${result.failed.length}` : '')}
        </div>
      )}
    </div>
  )
}

function QuickCreate({ guildId, disabled, onDone }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('text')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function submit(event) {
    event.preventDefault()
    if (!name.trim()) return

    setBusy(true)
    setMsg(null)
    try {
      const { channel } = await api.createChannel(guildId, { name, type })
      setMsg({ ok: true, text: `สร้าง ${CHANNEL_LABEL[type]} "${channel.name}" แล้ว` })
      setName('')
      onDone()
    } catch (error) {
      setMsg({ ok: false, text: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3 className="card-title">
        <Plus size={17} color="var(--g2)" /> สร้างรายการเดียว
      </h3>

      <div className="form-group">
        <label>ชื่อ</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น welcome" maxLength={100} />
      </div>

      <div className="form-group">
        <label>ชนิด</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="text">ห้องข้อความ</option>
          <option value="voice">ห้องเสียง</option>
          <option value="announcement">ห้องประกาศ</option>
          <option value="stage">เวที</option>
          <option value="forum">ฟอรัม</option>
          <option value="category">หมวดหมู่</option>
        </select>
      </div>

      <button className="btn btn-primary btn-block" disabled={disabled || busy || !name.trim()}>
        <Plus size={15} /> {busy ? 'กำลังสร้าง...' : 'สร้าง'}
      </button>

      {msg && (
        <div className={msg.ok ? 'badge badge-success' : 'badge badge-danger'} style={{ marginTop: 12 }}>
          {msg.text}
        </div>
      )}
    </form>
  )
}

function ManagePanel({ guildId, data, onDone }) {
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected((prev) => (prev.size === data.channels.length ? new Set() : new Set(data.channels.map((c) => c.id))))
  }

  async function remove() {
    const count = selected.size
    if (!count) return
    if (!window.confirm(`ลบ ${count} ห้อง?\n\nการลบหมวดหมู่จะลบห้องข้างในด้วย และย้อนกลับไม่ได้`)) return

    setBusy(true)
    setMsg(null)
    try {
      const result = await api.deleteChannels(guildId, [...selected])
      setMsg({
        ok: result.failed.length === 0,
        text: `ลบสำเร็จ ${result.deleted.length}/${count}` +
          (result.failed.length ? ` · พัง ${result.failed.length}: ${result.failed[0].error}` : ''),
      })
      setSelected(new Set())
      onDone()
    } catch (error) {
      setMsg({ ok: false, text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const orphans = data.channels.filter((c) => !c.parentId)
  const byParent = (parentId) => data.channels.filter((c) => c.parentId === parentId)

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <h3 className="card-title" style={{ margin: 0 }}>
          <Server size={17} color="var(--g2)" /> โครงสร้างปัจจุบัน
          <span className="muted" style={{ fontWeight: 400, fontSize: '0.85rem' }}>
            {data.categories.length} หมวดหมู่ · {data.channels.length} ห้อง · {data.roles.length} โรล
          </span>
        </h3>

        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={selectAll}>
            {selected.size === data.channels.length ? <CheckSquare size={13} /> : <Square size={13} />}
            เลือกทั้งหมด
          </button>
          <button className="btn btn-danger btn-sm" onClick={remove} disabled={busy || selected.size === 0}>
            <Trash2 size={13} /> ลบที่เลือก ({selected.size})
          </button>
        </div>
      </div>

      {data.categories.length === 0 && orphans.length === 0 && (
        <div className="empty">ยังไม่มีห้องในเซิร์ฟเวอร์นี้ — ลองใช้ template ด้านบน</div>
      )}

      {data.categories.map((cat) => (
        <div key={cat.id} style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            <FolderPlus size={15} color="var(--g2)" />
            {cat.name}
            <span className="muted" style={{ fontWeight: 400 }}>
              ({byParent(cat.id).length})
            </span>
          </div>
          {byParent(cat.id).map((ch) => (
            <ChannelRow key={ch.id} channel={ch} selected={selected.has(ch.id)} onToggle={toggle} />
          ))}
        </div>
      ))}

      {orphans.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ padding: '8px 0', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            ไม่มีหมวดหมู่ ({orphans.length})
          </div>
          {orphans.map((ch) => (
            <ChannelRow key={ch.id} channel={ch} selected={selected.has(ch.id)} onToggle={toggle} />
          ))}
        </div>
      )}

      {msg && (
        <div className={msg.ok ? 'badge badge-success' : 'badge badge-danger'} style={{ marginTop: 14 }}>
          {msg.text}
        </div>
      )}
    </div>
  )
}

function ChannelRow({ channel, selected, onToggle }) {
  const Icon = CHANNEL_ICON[channel.type] ?? Hash
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 10px',
        marginLeft: 14,
        borderRadius: 9,
        cursor: 'pointer',
        background: selected ? 'var(--glass-strong)' : 'transparent',
        transition: 'background .15s',
      }}
    >
      <input type="checkbox" checked={selected} onChange={() => onToggle(channel.id)} />
      <Icon size={14} color="var(--text-muted)" />
      <span style={{ flex: 1, fontSize: '0.9rem' }}>{channel.name}</span>
      <span className="muted" style={{ fontSize: '0.76rem' }}>
        {CHANNEL_LABEL[channel.type] ?? channel.type}
      </span>
    </label>
  )
}
