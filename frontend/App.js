const { useState, useEffect, useMemo } = React;

// --- Components ---
const MetricCard = ({ title, value, status }) => (
    <div className="card">
        <h4 style={{color: 'var(--zinc-400)', fontSize: '0.7rem', textTransform: 'uppercase', margin: '0 0 8px'}}>{title}</h4>
        <div style={{fontSize: '1.8rem', fontWeight: 'bold'}}>{value}</div>
        {status && <span style={{fontSize: '0.7rem', color: status === 'Synced' ? 'var(--emerald-500)' : 'var(--red-500)'}}>● {status}</span>}
    </div>
);

const App = () => {
    const [logs, setLogs] = useState([
        { _id: 'TXN-998', status: 'active', amount: 5000 },
        { _id: 'TXN-999', status: 'pending_auth', amount: 3200 }
    ]);
    const [filter, setFilter] = useState('all');

    const filteredLogs = useMemo(() => 
        filter === 'all' ? logs : logs.filter(l => l.status === filter)
    , [filter, logs]);

    // Safety check for Recharts
    const RechartsLib = window.Recharts || {};
    const { ResponsiveContainer, AreaChart, Area } = RechartsLib;

    const funnelData = [
        { name: 'Attempts', f: 100 }, { name: 'Failures', f: 40 },
        { name: 'AuthReq', f: 20 }, { name: 'Recovered', f: 15 }
    ];

    return (
        <div className="dashboard">
            <h1 style={{fontSize: '1.2rem', color: 'var(--zinc-400)', marginBottom: '32px'}}>NOMBA // ORCHESTRATOR // TERMINAL</h1>
            
            <div className="card-grid">
                <MetricCard title="Auto-Recovery Rate" value="85%" />
                <MetricCard title="Revenue at Risk" value="₦4.2M" />
                <MetricCard title="Reconciliation" value="Synced" status="Synced" />
            </div>

            <div className="card" style={{height: '250px', marginBottom: '24px'}}>
                {ResponsiveContainer && AreaChart ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={funnelData}>
                            <Area type="monotone" dataKey="f" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.1} />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{color: 'var(--zinc-400)'}}>Chart loading...</div>
                )}
            </div>

            <div className="table-container">
                <select className="action-dropdown" onChange={(e) => setFilter(e.target.value)} style={{marginBottom: '16px'}}>
                    <option value="all">ALL STATUSES</option>
                    <option value="active">ACTIVE</option>
                    <option value="pending_auth">PENDING AUTH</option>
                </select>
                <table>
                    <thead><tr><th>ID</th><th>STATUS</th><th>AMOUNT</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                        {filteredLogs.map(log => (
                            <tr key={log._id}>
                                <td>{log._id}</td>
                                <td className={log.status === 'active' ? 'status-active' : 'status-pending glow-pulse'}>
                                    {log.status.toUpperCase()}
                                </td>
                                <td>₦{log.amount}</td>
                                <td>
                                    <select className="action-dropdown">
                                        <option>ACTION</option>
                                        <option>Force Retry</option>
                                        <option>Pause Dunning</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="card" style={{marginTop: '24px'}}>
                <button className="btn btn-primary" onClick={() => setLogs([...logs, { _id: 'TXN-' + Math.floor(Math.random()*1000), status: 'pending_auth', amount: 1000 }])}>
                    SIMULATE: TRIGGER EVENT
                </button>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
