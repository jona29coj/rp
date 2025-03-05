import { Pool } from 'pg'; // Import pg library to interact with PostgreSQL

// Create a pool for connecting to the PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Get the connection string from .env.local
});

// Function to calculate the energy consumption considering the rollover
function calculateConsumption(first, last) {
  const MAX_REGISTER_VALUE = 65535;
  if (last < first) {
    // Handle rollover case
    return (MAX_REGISTER_VALUE - first + last + 1) / 1000; // Convert Wh to kWh
  }
  return (last - first) / 1000; // Convert Wh to kWh
}

async function getEnergyDataForMonth(month) {
  const startDate = new Date(month);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

  const result = await pool.query(`
    WITH FirstLast AS (
      -- Get the first and last entry for each energy meter for each day of the specified month
      SELECT
        energy_meter_id,
        date_trunc('day', timestamp) AS day,
        MIN(timestamp) AS first_entry,
        MAX(timestamp) AS last_entry
      FROM energy_data
      WHERE timestamp >= $1
        AND timestamp < $2
        AND energy_meter_id IN (2, 4, 5, 6)
        AND timestamp <= now() - interval '5 minutes' -- Only include data up to 5 minutes before the current time
        AND date_trunc('day', timestamp) < date_trunc('day', now()) -- Only include complete days
      GROUP BY energy_meter_id, day
    ),
    EnergyData AS (
      -- Get Wh received for each first and last entry
      SELECT
        energy_meter_id,
        wh_received,
        timestamp
      FROM energy_data
      WHERE timestamp >= $1
        AND timestamp < $2
        AND energy_meter_id IN (2, 4, 5, 6)
        AND timestamp <= now() - interval '5 minutes' -- Only include data up to 5 minutes before the current time
    )
    SELECT
      f.energy_meter_id,
      f.day,
      f.first_entry,
      f.last_entry,
      e1.wh_received AS first_wh_received,
      e2.wh_received AS last_wh_received
    FROM FirstLast f
    JOIN EnergyData e1 ON f.energy_meter_id = e1.energy_meter_id AND f.first_entry = e1.timestamp
    JOIN EnergyData e2 ON f.energy_meter_id = e2.energy_meter_id AND f.last_entry = e2.timestamp
  `, [startDate, endDate]);

  // Format the results
  const formattedResults = result.rows.map(entry => ({
    energy_meter_id: entry.energy_meter_id,
    day: entry.day,
    first_entry: entry.first_entry,
    last_entry: entry.last_entry,
    first_wh_received: entry.first_wh_received,
    last_wh_received: entry.last_wh_received,
    wh_received_difference_kwh: calculateConsumption(entry.first_wh_received, entry.last_wh_received).toFixed(1) // Convert Wh to kWh with one decimal place
  }));

  // Organize data by energy meter and day
  const totalConsumptionByMeter = formattedResults.reduce((acc, entry) => {
    if (!acc[entry.energy_meter_id]) {
      acc[entry.energy_meter_id] = [];
    }
    acc[entry.energy_meter_id].push({
      day: entry.day,
      first_entry: entry.first_entry,
      last_entry: entry.last_entry,
      first_wh_received: entry.first_wh_received,
      last_wh_received: entry.last_wh_received,
      total_wh_difference_kwh: parseFloat(entry.wh_received_difference_kwh)
    });
    return acc;
  }, {});

  return totalConsumptionByMeter;
}

export default async function handler(req, res) {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: 'Month parameter is required' });
    }

    const energyData = await getEnergyDataForMonth(month); // Call the function to get the data for the specified month

    res.status(200).json(energyData);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
}