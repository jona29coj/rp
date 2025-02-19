import { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import 'tailwindcss/tailwind.css';

export default function Home() {
  const [energyData, setEnergyData] = useState([]);
  const [totalEnergyConsumptionByRange, setTotalEnergyConsumptionByRange] = useState({});
  const [totalConsumptionFromStart, setTotalConsumptionFromStart] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch data from the API endpoint
        const response = await fetch('/api/hp-data');
        const data = await response.json();

        // Set the fetched data
        setEnergyData(data.energyData);
        setTotalEnergyConsumptionByRange(data.totalEnergyConsumptionByRange);
        setTotalConsumptionFromStart(data.totalConsumptionFromStart);

        // Debug logs
        console.log("Fetched energy data:", data);
      } catch (error) {
        console.error('Error fetching energy data:', error);
      }
    };

    fetchData();
  }, []);

  const currentHour = new Date().getHours();
  const timeRanges = Array.from({ length: currentHour }, (_, i) => {
    const startHour = String(i).padStart(2, '0');
    return `${startHour}:00:00-${startHour}:59:59`;
  });

  const energyConsumptionData = timeRanges.reduce((acc, range) => {
    acc[range] = totalEnergyConsumptionByRange[range] !== undefined ? Number(totalEnergyConsumptionByRange[range]).toFixed(1) : 0;
    return acc;
  }, {});

  // Debug logs
  console.log("Time ranges:", timeRanges);
  console.log("Energy consumption data:", energyConsumptionData);

  const chartOptions = {
    chart: {
      type: "column", // Vertical bar chart
    },
    title: {
      text: 'Energy Consumption',
      style: { fontSize: "18px", color: "#333" },
    },
    xAxis: {
      categories: Object.keys(energyConsumptionData),
      title: {
        text: 'Time Range',
        style: { fontSize: "14px", color: "#666" },
      },
    },
    yAxis: {
      min: 0,
      title: {
        text: 'kWh',
        style: { fontSize: "14px", color: "#666" },
      },
      gridLineWidth: 1, // Adds grid lines on the y-axis
      labels: {
        style: {
          fontSize: "12px", // Font size for the numbers on y-axis
        },
      },
    },
    plotOptions: {
      column: {
        dataLabels: {
          enabled: true,
          style: {
            fontWeight: "bold",
            color: "black",
          },
        },
      },
    },
    series: [
      {
        name: "Energy Consumption",
        data: Object.values(energyConsumptionData).map((value) => {
          if (value <= 9.9) {
            return { y: parseFloat(value), color: "rgba(76, 175, 80, 0.7)" }; // Green
          } else if (value > 9.9 && value <= 19.9) {
            return { y: parseFloat(value), color: "rgba(255, 152, 0, 0.7)" }; // Orange
          } else {
            return { y: parseFloat(value), color: "rgba(244, 67, 54, 0.7)" }; // Red
          }
        }),
      },
    ],
    tooltip: {
      shared: true,
      formatter: function () {
        const range = String(this.x); // Ensure range is a string
        const startHour = range.split(':')[0];
        const startTime = startHour + ":00:00";
        const endTime = startHour + ":59:59";
        return `<b>Hour ${startHour}</b>: ${startTime} - ${endTime}<br/><b>Consumption</b>: ${this.y.toFixed(1)} kWh`;
      },
    },
    legend: {
      enabled: false,
    },
    credits: {
      enabled: false,
    },
  };

  return (
    <div>
      <div className="w-full flex flex-col p-6 bg-white shadow-lg rounded-lg">
        <div className="flex justify-between items-center pb-6">
          <h2 className="text-xl font-semibold">Live Consumption</h2>
        </div>
        <div style={{ width: "100%", height: "400px" }}>
          <HighchartsReact highcharts={Highcharts} options={chartOptions} />
        </div>
      </div>
      {timeRanges.map(range => (
        <div key={range}>
          <h2>{range}</h2>
          <h3>
            Total Energy Consumption: { 
              totalEnergyConsumptionByRange[range] !== undefined 
                ? Number(totalEnergyConsumptionByRange[range]).toFixed(1) 
                : "Loading..." 
            } kWh
          </h3>
          <table>
            <thead>
              <tr>
                <th>Energy Meter ID</th>
                <th>First Entry Time</th>
                <th>First Entry Wh Received</th>
                <th>Last Entry Time</th>
                <th>Last Entry Wh Received</th>
                <th>Wh Received Difference (kWh)</th>
              </tr>
            </thead>
            <tbody>
              {energyData.length > 0 ? (
                energyData
                  .filter(entry => {
                    const entryHour = new Date(entry.first_entry).getHours();
                    const rangeHour = parseInt(range.split(":")[0], 10);
                    return entryHour === rangeHour;
                  })
                  .map((entry) => (
                    <tr key={`${entry.energy_meter_id}-${range}`}>
                      <td>{entry.energy_meter_id}</td>
                      <td>{new Date(entry.first_entry).toLocaleString()}</td>
                      <td>{entry.first_wh_received}</td>
                      <td>{new Date(entry.last_entry).toLocaleString()}</td>
                      <td>{entry.last_wh_received}</td>
                      <td>
                        { 
                          !isNaN(Number(entry.wh_received_difference_kwh)) 
                            ? Number(entry.wh_received_difference_kwh).toFixed(1) 
                            : "N/A" 
                        } kWh
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="6">Loading...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
      <div>
        <h2>Total Consumption From 00:00:00 Until Now for Each Energy Meter</h2>
        <table>
          <thead>
            <tr>
              <th>Energy Meter ID</th>
              <th>Total Consumption (kWh)</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(totalConsumptionFromStart).length > 0 ? (
              Object.entries(totalConsumptionFromStart).map(([meterId, data]) => (
                <tr key={meterId}>
                  <td>{meterId}</td>
                  <td>{data.total_wh_difference_kwh.toFixed(1)} kWh</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2">Loading...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}