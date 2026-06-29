const { useState, useEffect } = React;
const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } = Recharts;

const useBillingData = () => {
    const [data, setData] = useState({ subscriptions: [], logs: [] });
    // Replace with real backend URL in production
    const fetchData = async () => {
        try {
            // const res = await fetch('/api/portal/u1'); // Example endpoint
            // const json = await res.json();
            // setData(json);
            setData({
                subscriptions: [{ _id: 's1', status: 'active' }],
                logs: [
                    { _id: 'l1', status: 'active', amount: 100 },
                    { _id: 'l2', status: 'pending_auth', amount: 200 },
                    { _id: 'l3', status: 'failed', amount: 50 }
                ]
            });
        } catch (e) { console.error(e); }
    };
    useEffect(() => { fetchData(); }, []);
    return { data, refetch: fetchData };
};

const InterventionModal = ({ transaction, onClose, onAction }) => (
    <div className="modal-backdrop">
        <div className="modal">
            <h3>Intervene: {transaction._id}</h3>
            <button className="btn" onClick={() => onAction('retry')}>Force Retry</button>
            <button className="btn" onClick={() => onAction('pause')}>Pause</button>
            <button className="btn" onClick={onClose}>Close</button>
        </div>
    </div>
);

const App = () => {
    const { data, refetch } = useBillingData();
    const [selectedTxn, setSelectedTxn] = useState(null);

    const funnelData = [
        { name: 'Failed', value: 10 },
        { name: 'Requested', value: 7 },
        { name: 'Authorized', value: 5 },
        { name: 'Recovered', value: 4 },
    ];

    return (
        <div className="dashboard">
            <h1>Merchant Billing Dashboard</h1>
            <div className="card-grid">
                <div className="card"><h3>Total Revenue</h3><p>$10,000</p></div>
                <div className="card"><h3>Churn Risk</h3><p>2%</p></div>
                <div className="card"><h3>Pending Auth</h3><p>5</p></div>
                <div className="card"><h3>Auto-Recovery</h3><p>85%</p></div>
            </div>

            <div className="card" style={{height: '200px', marginBottom: '20px'}}>
                <ResponsiveContainer>
                    <BarChart data={funnelData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#38bdf8" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="table-container">
                <table>
                    <thead><tr><th>ID</th><th>Status</th><th>Amount</th><th>Action</th></tr></thead>
                    <tbody>
                        {data.logs.map(log => (
                            <tr key={log._id}>
                                <td>{log._id}</td>
                                <td><span className={`status-badge bg-${log.status.replace('_', '-')}`}>{log.status}</span></td>
                                <td>${log.amount}</td>
                                <td><button className="btn btn-primary" onClick={() => setSelectedTxn(log)}>Intervene</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedTxn && <InterventionModal transaction={selectedTxn} onClose={() => setSelectedTxn(null)} onAction={(act) => { console.log(act); setSelectedTxn(null); refetch(); }} />}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
