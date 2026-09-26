/**
 * Service helpers for communicating with the dashboard / external APIs
 * Skeleton — expand as needed
 */

export async function fetchDashboardStats() {
  // Placeholder for future internal service calls
  return null
}

export function formatGuildData(guild) {
  return {
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
    icon: guild.iconURL({ size: 128 }),
    ownerId: guild.ownerId,
  }
}
