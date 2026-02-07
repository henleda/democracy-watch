import { query } from '@democracy-watch/shared';

export interface PlatformStats {
  memberCount: number;
  billCount: number;
  voteCount: number;
  rollCallCount: number;
}

export class StatsService {
  async getStats(): Promise<PlatformStats> {
    const results = await query<{ name: string; count: string }>(`
      SELECT 'members' as name, COUNT(*)::text as count FROM members.members WHERE is_active = true
      UNION ALL
      SELECT 'bills' as name, COUNT(*)::text as count FROM voting.bills
      UNION ALL
      SELECT 'votes' as name, COUNT(*)::text as count FROM voting.votes
      UNION ALL
      SELECT 'rollCalls' as name, COUNT(*)::text as count FROM voting.roll_calls
    `);

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.name] = parseInt(row.count, 10);
    }

    return {
      memberCount: counts.members || 0,
      billCount: counts.bills || 0,
      voteCount: counts.votes || 0,
      rollCallCount: counts.rollCalls || 0,
    };
  }
}
