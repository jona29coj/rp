import MConsumption from '@/components/MConsumption';
import Consumption from '../components/Consumption';
import PeakDemand from '../components/PeakDemand';
import 'tailwindcss/tailwind.css';
import OPeakDemand from '@/components/OPeakDemand';
import OMConsumption from '@/components/OMConsumption';

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Energy Management Dashboard</h1>
      <Consumption />
      <OPeakDemand />
      <OMConsumption />
      <MConsumption />
      <PeakDemand />
    </div>
  );
}