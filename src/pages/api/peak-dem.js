import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getPeakDemandData(date) {
  try {
    const query = `
      WITH MinuteData AS (
        SELECT
            energy_meter_id,
            date_trunc('minute', "timestamp") AS minute,
            ROUND(va_total / 1000.0, 1) AS apparent_power_kva,
            "timestamp"
        FROM energy_data
        WHERE "timestamp" >= $1::date
          AND "timestamp" < $1::date + interval '1 day'
          AND energy_meter_id IN (2, 4, 5, 6)
      ),
      IntervalData AS (
        SELECT
            energy_meter_id,
            date_trunc('minute', minute) - interval '1 minute' * (EXTRACT(MINUTE FROM minute)::int % 15) AS interval_start,
            MAX(apparent_power_kva) AS peak_demand_kva
        FROM MinuteData
        GROUP BY energy_meter_id, interval_start
      ),
      FinalData AS (
        SELECT DISTINCT ON (M.energy_meter_id, I.interval_start)
            M.energy_meter_id,
            I.interval_start,
            I.peak_demand_kva,
            M."timestamp" AS peak_timestamp
        FROM MinuteData M
        JOIN IntervalData I
          ON M.energy_meter_id = I.energy_meter_id
          AND (date_trunc('minute', M.minute) - interval '1 minute' * (EXTRACT(MINUTE FROM M.minute)::int % 15)) = I.interval_start
          AND M.apparent_power_kva = I.peak_demand_kva
        ORDER BY M.energy_meter_id, I.interval_start, M."timestamp" DESC
      )
      
      SELECT 
          energy_meter_id, 
          interval_start, 
          ROUND(peak_demand_kva, 1) AS peak_demand_kva, 
          peak_timestamp
      FROM FinalData
      WHERE interval_start < now() - interval '20 minutes'
      
      ORDER BY energy_meter_id, interval_start;
    `;

    const result = await pool.query(query, [date]);
    return result.rows;
  } catch (error) {
    console.error('Database Query Error:', error);
    throw new Error('Database query failed');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  try {
    const peakDemandData = await getPeakDemandData(date);
    res.status(200).json(peakDemandData);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}