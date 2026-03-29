import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

const monthNames = [
  "", "Jan", "Feb", "Mar", "Apr", "May",
  "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const MonthlyTrendChart = ({ trendData }) => {

  const formatted = trendData.map(t => ({
    month: monthNames[t.month],
    total: t.total
  }));

  return (
    <div className="card shadow-lg rounded-4 p-3 mb-5">
      <h5 className="text-center mb-3">📈 Monthly SOS Trend</h5>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="total" stroke="#0d6efd" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyTrendChart;
