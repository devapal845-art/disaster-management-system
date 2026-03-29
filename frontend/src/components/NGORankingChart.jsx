import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

const NGORankingChart = ({ ngoData }) => {

  const formatted = ngoData.map(ngo => ({
    name: ngo.ngoName,
    rescued: ngo.rescued
  }));

  return (
    <div className="card shadow-lg rounded-4 p-3 mb-5">
      <h5 className="text-center mb-3">🏆 NGO Performance Ranking</h5>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="rescued" fill="#198754" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NGORankingChart;
