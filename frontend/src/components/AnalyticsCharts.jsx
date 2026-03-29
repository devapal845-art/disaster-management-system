import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer
} from "recharts";


const COLORS = ["#007bff", "#ffc107", "#28a745"];

const AnalyticsCharts = ({ analytics }) => {

  const barData = [
    { name: "Total SOS", value: analytics.totalSOS },
    { name: "Pending", value: analytics.pendingCount },
    { name: "Rescued", value: analytics.rescuedCount }
  ];

  const pieData = [
    { name: "Pending", value: analytics.pendingCount },
    { name: "Rescued", value: analytics.rescuedCount }
  ];

  return (
    <div className="row g-4 mb-5">

      {/* Bar Chart */}
      <div className="col-md-6">
        <div className="card shadow-lg rounded-4 p-3">
          <h5 className="text-center mb-3">📊 SOS Overview</h5>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#007bff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="col-md-6">
        <div className="card shadow-lg rounded-4 p-3">
          <h5 className="text-center mb-3">🥧 Rescue Distribution</h5>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsCharts;
