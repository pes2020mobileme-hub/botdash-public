/**
 * Server builder: read a guild's structure, create channels / categories /
 * roles, and delete them.
 *
 * Discord is strict about ordering (a channel needs its category to exist
 * first) and rate limits aggressively, so bulk operations are sequential with
 * a small delay, and every result is reported rather than thrown.
 */

import { ChannelType, PermissionFlagsBits } from 'discord.js'

const CHANNEL_TYPES = {
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
  stage: ChannelType.GuildStageVoice,
  category: ChannelType.GuildCategory,
  announcement: ChannelType.GuildAnnouncement,
  forum: ChannelType.GuildForum,
};

const TEXT_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
])

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function resolveGuild(client, guildId) {
  const guild = client.guilds.cache.get(String(guildId))
  if (!guild) {
    const error = new Error(`ไม่พบเซิร์ฟเวอร์ ${guildId} — บอทอาจยังไม่ได้ cache`)
    error.status = 404
    throw error
  }
  return guild
}

/** Permissions the bot needs for the builder to be useful. */
export function botPermissions(guild) {
  const me = guild.members.me
  if (!me) return null

  const perms = me.permissions
  const can = (flag) => perms.has(flag)

  return {
    administrator: can(PermissionFlagsBits.Administrator),
    manageChannels: can(PermissionFlagsBits.ManageChannels),
    manageRoles: can(PermissionFlagsBits.ManageRoles),
    manageWebhooks: can(PermissionFlagsBits.ManageWebhooks),
    viewChannel: can(PermissionFlagsBits.ViewChannel),
  }
}

export function guildStructure(guild) {
  const categories = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildCategory)
    .map((c) => ({
      id: c.id,
      name: c.name,
      position: c.position,
    }))
    .sort((a, b) => a.position - b.position)

  const channels = guild.channels.cache
    .filter((c) => c.type !== ChannelType.GuildCategory)
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: channelTypeKey(c.type),
      parentId: c.parentId ?? null,
      position: c.position,
      nsfw: c.nsfw ?? false,
      rateLimitPerUser: c.rateLimitPerUser ?? null,
      userLimit: c.userLimit ?? null,
      topic: c.topic ?? null,
    }))
    .sort((a, b) => a.position - b.position)

  const roles = guild.roles.cache
    .filter((r) => !r.managed && r.id !== guild.id)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.hexColor,
      position: r.position,
      hoist: r.hoist,
      mentionable: r.mentionable,
    }))
    .sort((a, b) => b.position - a.position)

  return {
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL({ size: 128 }),
    ownerId: guild.ownerId,
    memberCount: guild.memberCount,
    permissions: botPermissions(guild),
    categories,
    channels,
    roles,
  }
}

function channelTypeKey(type) {
  switch (type) {
    case ChannelType.GuildText:
      return 'text'
    case ChannelType.GuildVoice:
      return 'voice'
    case ChannelType.GuildStageVoice:
      return 'stage'
    case ChannelType.GuildAnnouncement:
      return 'announcement'
    case ChannelType.GuildForum:
      return 'forum'
    default:
      return 'other'
  }
}

function resolveType(key) {
  const type = CHANNEL_TYPES[key]
  if (!type) {
    const error = new Error(`ชนิดห้องไม่ถูกต้อง: ${key}`)
    error.status = 400
    throw error
  }
  return type
}

export async function createChannel(guild, { name, type = 'text', parentId, topic, nsfw, slowmode, userLimit }) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) {
    const error = new Error('ต้องระบุชื่อห้อง')
    error.status = 400
    throw error
  }
  if (trimmed.length > 100) {
    const error = new Error('ชื่อห้องยาวเกิน 100 ตัวอักษร')
    error.status = 400
    throw error
  }

  const typeId = resolveType(type)

  // Categories can carry a position, everything else gets a parent
  const payload = { name: trimmed, type: typeId }

  if (typeId === ChannelType.GuildCategory) {
    if (parentId) payload.parentId = parentId
  } else {
    if (parentId) {
      const parent = await guild.channels.fetch(parentId).catch(() => null)
      if (!parent || parent.type !== ChannelType.GuildCategory) {
        const error = new Error(`หมวดหมู่ ${parentId} ไม่มีอยู่ หรือไม่ใช่หมวดหมู่`)
        error.status = 400
        throw error
      }
      payload.parentId = parentId
    }
    if (TEXT_TYPES.has(typeId)) {
      if (topic) payload.topic = String(topic).slice(0, 1024)
      if (nsfw != null) payload.nsfw = Boolean(nsfw)
      if (slowmode != null) payload.rateLimitPerUser = Math.min(21600, Math.max(0, Number(slowmode)))
    }
    if (typeId === ChannelType.GuildVoice) {
      if (userLimit != null) payload.userLimit = Math.min(99, Math.max(0, Number(userLimit)))
    }
  }

  const channel = await guild.channels.create(payload)
  return { id: channel.id, name: channel.name, type: channelTypeKey(channel.type), parentId: channel.parentId }
}

export async function createRole(guild, { name, color, hoist, mentionable }) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) {
    const error = new Error('ต้องระบุชื่อโรล')
    error.status = 400
    throw error
  }

  const payload = { name: trimmed }
  if (color) payload.color = String(color).replace('#', '')
  if (hoist != null) payload.hoist = Boolean(hoist)
  if (mentionable != null) payload.mentionable = Boolean(mentionable)

  const role = await guild.roles.create(payload, { reason: 'BotDash' })
  return { id: role.id, name: role.name, color: role.hexColor }
}

export async function deleteChannels(guild, ids) {
  const results = { deleted: [], failed: [] }

  for (const id of ids ?? []) {
    try {
      const channel = await guild.channels.fetch(String(id))
      if (!channel) throw new Error('ไม่พบห้อง (อาจถูกลบไปแล้ว)')

      // Deleting a category takes its children with it
      const children = channel.children?.cache?.size ?? 0
      await channel.delete('BotDash')

      results.deleted.push({ id: String(id), name: channel.name, children })
      await delay(350) // stay well under Discord's rate limit
    } catch (error) {
      results.failed.push({ id: String(id), error: error.message })
    }
  }

  return results
}

export async function deleteRoles(guild, ids) {
  const results = { deleted: [], failed: [] }

  for (const id of ids ?? []) {
    try {
      const role = await guild.roles.fetch(String(id))
      if (!role) throw new Error('ไม่พบโรล')
      if (role.managed) throw new Error('ลบโรลที่ผูกกับ integration ไม่ได้')
      if (role.id === guild.id) throw new Error('ลบ @everyone ไม่ได้')

      const name = role.name
      await role.delete('BotDash')
      results.deleted.push({ id: String(id), name })
      await delay(350)
    } catch (error) {
      results.failed.push({ id: String(id), error: error.message })
    }
  }

  return results
}

/**
 * Apply a template: { name, categories: [{ name, channels: [{ name, type }] }] }
 * Categories are created first, then their channels, so ordering is safe.
 */
export async function applyTemplate(guild, template, { onProgress } = {}) {
  const report = { categories: [], channels: [], roles: [], failed: [] }
  const report_ = onProgress ?? (() => {})

  for (const role of template.roles ?? []) {
    try {
      const created = await createRole(guild, role)
      report.roles.push(created)
      report_(`สร้างโรล ${created.name}`)
    } catch (error) {
      report.failed.push({ stage: 'role', name: role.name, error: error.message })
    }
    await delay(250)
  }

  for (const category of template.categories ?? []) {
    let categoryId = null

    try {
      const created = await createChannel(guild, { name: category.name, type: 'category' })
      categoryId = created.id
      report.categories.push(created)
      report_(`สร้างหมวดหมู่ ${created.name}`)
    } catch (error) {
      report.failed.push({ stage: 'category', name: category.name, error: error.message })
      continue // its channels would have nowhere to live
    }

    await delay(350)

    for (const channel of category.channels ?? []) {
      try {
        const created = await createChannel(guild, {
          ...channel,
          parentId: categoryId,
        })
        report.channels.push({ ...created, category: category.name })
        report_(`สร้างห้อง ${created.name}`)
      } catch (error) {
        report.failed.push({ stage: 'channel', name: channel.name, error: error.message })
      }
      await delay(350)
    }
  }

  return report
}
