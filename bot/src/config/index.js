// Bot configuration
// Load from .env or defaults

export default {
  prefix: process.env.PREFIX || '!',
  status: process.env.STATUS || 'online',
  activity: process.env.ACTIVITY || 'Watching the dashboard',
  owners: (process.env.OWNERS || '').split(',').filter(Boolean),
}
