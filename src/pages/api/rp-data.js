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

async function getEnergyDataForDay() {
  const result = await pool.query(`
    WITH FirstLast AS (
      -- Get the first and last entry for each energy meter from two days ago
      SELECT
        energy_meter_id,
        date_trunc('hour', timestamp) AS hour,
        MIN(timestamp) AS first_entry,
        MAX(timestamp) AS last_entry
      FROM energy_data
      WHERE timestamp >= current_date - interval '2 day'
        AND timestamp < current_date - interval '1 day'
        AND energy_meter_id IN (2, 4, 5, 6)
      GROUP BY energy_meter_id, hour
    ),
    EnergyData AS (
      -- Get Wh received for each first and last entry
      SELECT
        energy_meter_id,
        wh_received,
        timestamp
      FROM energy_data
      WHERE timestamp >= current_date - interval '2 day'
        AND timestamp < current_date - interval '1 day'
        AND energy_meter_id IN (2, 4, 5, 6)
    )
    SELECT
      f.energy_meter_id,
      f.hour,
      f.first_entry,
      f.last_entry,
      e1.wh_received AS first_wh_received,
      e2.wh_received AS last_wh_received
    FROM FirstLast f
    JOIN EnergyData e1 ON f.energy_meter_id = e1.energy_meter_id AND f.first_entry = e1.timestamp
    JOIN EnergyData e2 ON f.energy_meter_id = e2.energy_meter_id AND f.last_entry = e2.timestamp
  `);

  // Format the results
  const formattedResults = result.rows.map(entry => ({
    energy_meter_id: entry.energy_meter_id,
    hour: entry.hour,
    first_entry: entry.first_entry,
    last_entry: entry.last_entry,
    first_wh_received: entry.first_wh_received,
    last_wh_received: entry.last_wh_received,
    wh_received_difference_kwh: calculateConsumption(entry.first_wh_received, entry.last_wh_received).toFixed(1) // Convert Wh to kWh with one decimal place
  }));

  // Calculate the total energy consumption for each hour
  const totalEnergyConsumptionByRange = formattedResults.reduce((acc, entry) => {
    const hour = new Date(entry.hour).getHours();
    const timeRange = `${hour.toString().padStart(2, '0')}:00:00-${hour.toString().padStart(2, '0')}:59:59`;
    acc[timeRange] = (acc[timeRange] || 0) + parseFloat(entry.wh_received_difference_kwh);
    return acc;
  }, {});

  // Calculate the total consumption for each energy meter from the sum of Wh Received differences
  const totalConsumptionFromStart = formattedResults.reduce((acc, entry) => {
    if (!acc[entry.energy_meter_id]) {
      acc[entry.energy_meter_id] = {
        total_wh_difference_kwh: 0,
        initial_wh_received: entry.first_wh_received,
        total_wh_received: entry.last_wh_received,
        start_time: entry.first_entry,
        end_time: entry.last_entry
      };
    }
    acc[entry.energy_meter_id].total_wh_difference_kwh += parseFloat(entry.wh_received_difference_kwh);
    return acc;
  }, {});

  return {
    energyData: formattedResults,
    totalEnergyConsumptionByRange,
    totalConsumptionFromStart
  };
}

export default async function handler(req, res) {
  try {
    const energyData = await getEnergyDataForDay();

    res.status(200).json(energyData);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
}

