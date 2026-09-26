/**
 * Built-in templates. Users can also POST their own JSON to /api/templates.
 */

export const TEMPLATES = [
  {
    id: 'gaming',
    name: 'Gaming Server',
    description: 'หมวดหมู่พื้นฐานสำหรับเซิร์ฟเกม',
    roles: [
      { name: 'Member', color: '3498db' },
      { name: 'VIP', color: 'f1c40f', hoist: true },
      { name: 'Moderator', color: '9b59b6', hoist: true, mentionable: true },
    ],
    categories: [
      {
        name: '▌ข้อมูล',
        channels: [
          { name: 'welcome', type: 'text' },
          { name: 'rules', type: 'text' },
          { name: 'announcements', type: 'announcement' },
        ],
      },
      {
        name: '▌สนทนา',
        channels: [
          { name: 'general', type: 'text' },
          { name: 'introductions', type: 'text' },
          { name: 'support', type: 'text' },
        ],
      },
      {
        name: '▌เสียง',
        channels: [
          { name: 'General Voice', type: 'voice' },
          { name: 'Music', type: 'voice' },
          { name: 'Stage', type: 'stage' },
        ],
      },
    ],
  },
  {
    id: 'community',
    name: 'Community',
    description: 'เหมาะกับชุมชน/คอมมูนิตี้ทั่วไป',
    roles: [
      { name: 'Member', color: '2ecc71' },
      { name: 'Moderator', color: 'e67e22', hoist: true },
    ],
    categories: [
      {
        name: 'ยินดีต้อนรับ',
        channels: [
          { name: 'welcome', type: 'text' },
          { name: 'rules', type: 'text' },
        ],
      },
      {
        name: 'ห้องสนทนา',
        channels: [
          { name: 'general', type: 'text' },
          { name: 'media', type: 'text' },
          { name: 'memes', type: 'text' },
        ],
      },
      {
        name: 'เสียง',
        channels: [{ name: 'Voice', type: 'voice' }],
      },
    ],
  },
  {
    id: 'support',
    name: 'Support / Ticket',
    description: 'ระบบ ticket สำหรับรับเรื่องลูกค้า',
    roles: [
      { name: 'Staff', color: '5865f2', hoist: true, mentionable: true },
      { name: 'Support Team', color: '5865f2', hoist: true },
    ],
    categories: [
      {
        name: '🎫 ระบบ Ticket',
        channels: [
          { name: 'create-ticket', type: 'forum' },
          { name: 'tickets', type: 'text' },
        ],
      },
      {
        name: 'ฝ่ายขาย',
        channels: [
          { name: 'orders', type: 'text' },
          { name: 'faq', type: 'text' },
        ],
      },
      {
        name: 'ทีมงาน',
        channels: [
          { name: 'staff-chat', type: 'text' },
          { name: 'staff-room', type: 'voice' },
        ],
      },
    ],
  },
  {
    id: 'blank',
    name: 'Minimal',
    description: 'โครงเปล่า — เหลือห้องสนทนากับเสียง',
    roles: [{ name: 'Member', color: '95a5a6' }],
    categories: [
      {
        name: 'ห้องสนทนา',
        channels: [{ name: 'general', type: 'text' }],
      },
      {
        name: 'เสียง',
        channels: [{ name: 'Voice', type: 'voice' }],
      },
    ],
  },
]

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) ?? null
}
