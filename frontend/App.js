const { useState, useEffect, useMemo } = React;
// Safely access Recharts components
const { ResponsiveContainer, AreaChart, Area } = window.Recharts || {};

const BACKEND_URL = 'https://nomba.onrender.com';

// --- Unified API Client & Session Manager ---
const NombaClient = {
    token: localStorage.getItem('nomba_token'),
    setToken: (token) => { localStorage.setItem('nomba_token', token); NombaClient.token = token; },
    
    generateIdempotencyKey: () => 'idemp_' + Math.random().toString(36).substr(2, 9),
    
    async request(endpoint, options = {}) {
        const headers = { 
            'Content-Type': 'application/json',
            ...(NombaClient.token && { 'Authorization': `Bearer ${NombaClient.token}` }),
            ...(options.method && options.method !== 'GET' && { 'x-idempotency-key': this.generateIdempotencyKey() })
        };
        const url = `${BACKEND_URL}/api${endpoint}`;
        const res = await fetch(url, { ...options, headers });
        
        // --- FIX: Handle 404 as "Empty Data", NOT as an error ---
        if (res.status === 404) return { status: 404, logs: [] };
        
        // --- FIX: Handle 400 as "API Error", NOT as a fatal promise rejection ---
        if (res.status === 400) return await res.json();
        
        if (!res.ok) {
            throw new Error(`API Request Failed: ${res.status}`);
        }
        return res.json();
    }
};

// --- Components ---
const MetricCard = ({ title, value, status }) => (
    <div className="card">
        <h4 style={{color: 'var(--zinc-400)', fontSize: '0.7rem', textTransform: 'uppercase', margin: '0 0 8px'}}>{title}</h4>
        <div style={{fontSize: '1.8rem', fontWeight: 'bold'}}>{value}</div>
        {status && <span style={{fontSize: '0.7rem', color: status === 'Synced' ? 'var(--emerald-500)' : 'var(--amber-500)'}}>● {status}</span>}
    </div>
);

const App = () => {
    const [logs, setLogs] = useState([]);
    const [metrics, setMetrics] = useState({ totalRevenue: 0, churnRiskRate: 0, autoRecoveryRate: 0 });
    const [jobs, setJobs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [reconStatus, setReconStatus] = useState('Synced');
    const [rechartsLoaded, setRechartsLoaded] = useState(false);

    // --- FIX FOR ERROR 1: Robust verification that ALL required Recharts components are defined ---
    useEffect(() => {
        const checkRecharts = () => {
            const Lib = window.Recharts;
            if (Lib && Lib.ResponsiveContainer && Lib.AreaChart && Lib.Area) {
                setRechartsLoaded(true);
            }
        };
        checkRecharts();
        // Fallback in case of race condition during script loading
        const interval = setInterval(checkRecharts, 500);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            // Using a valid 24-char hex string to pass backend ObjectId validation
            const [data, metricsData, jobsData] = await Promise.all([
                NombaClient.request('/portal/507f1f1f8b1d4b0003b51616'),
                NombaClient.request('/analytics/metrics'),
                NombaClient.request('/analytics/jobs?status=pending')
            ]);
            setLogs(data.logs || []);
            setMetrics(metricsData);
            setJobs(jobsData || []);
        } catch (e) { console.error("Fetch error:", e); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const triggerReconcile = async (sessionId) => {
        setReconStatus('Reconciling...');
        try {
            // FIX: Requery is a GET request on the backend, changed from POST to GET
            await NombaClient.request(`/subscriptions/requery/${sessionId}`, { method: 'GET' });
        } catch (e) { console.error(e); }
        setTimeout(() => setReconStatus('Synced'), 1500);
        fetchData();
    };

    const handleAction = async (action, transaction) => {
        try {
            if (action === 'cancel') {
                await NombaClient.request('/subscriptions/cancel', {
                    method: 'POST',
                    body: JSON.stringify({ orderReference: transaction._id })
                });
            } else {
                await NombaClient.request('/portal/retry-auth', {
                    method: 'POST',
                    body: JSON.stringify({ subscriptionId: transaction._id, status: action === 'retry' ? 'approved' : 'declined' })
                });
            }
            fetchData();
        } catch (e) { console.error("Action error:", e); }
    };

    const updateCard = async (transaction) => {
        try {
            const currentEmail = prompt("Enter current email:");
            const newEmail = prompt("Enter new email:");
            if (!currentEmail || !newEmail) return;

            await NombaClient.request('/subscriptions/update-tokenized-card', {
                method: 'POST',
                body: JSON.stringify({ tokenKey: transaction.tokenKey, currentEmailAddress: currentEmail, newEmailAddress: newEmail })
            });
            alert('Card updated');
        } catch (e) { console.error("Update card error:", e); }
    };

    const funnelData = [
        { name: 'Attempts', f: 100 }, { name: 'Failures', f: 40 },
        { name: 'AuthReq', f: 20 }, { name: 'Recovered', f: 15 }
    ];

    const renderChart = () => {
        if (!rechartsLoaded) return <div style={{color: 'var(--zinc-400)'}}>Loading Chart...</div>;
        
        const { ResponsiveContainer, AreaChart, Area } = window.Recharts;
        return (
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={funnelData}>
                    <Area type="monotone" dataKey="f" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.1} />
                </AreaChart>
            </ResponsiveContainer>
        );
    };

    const createSubscription = async () => {
        try {
            await NombaClient.request('/subscriptions', {
                method: 'POST',
                body: JSON.stringify({
                    userId: '507f1f1f8b1d4b0003b51616', // Using the hardcoded demo ID
                    tokenKey: 'tok_' + Math.random().toString(36).substr(2, 9),
                    amount: 5000,
                    billingCycle: 'monthly'
                })
            });
            fetchData();
        } catch (e) { console.error("Create subscription error:", e); }
    };

    return (
        <div className="dashboard">
            <h1 style={{fontSize: '1.2rem', color: 'var(--zinc-400)', marginBottom: '32px'}}>NOMBA // ORCHESTRATOR // TERMINAL</h1>
            
            <div className="card" style={{marginBottom: '24px'}}>
                <button className="btn btn-primary" onClick={createSubscription}>
                    SIMULATE: CREATE SUBSCRIPTION
                </button>
            </div>
            
            <div className="card-grid">
                <MetricCard title="Auto-Recovery Rate" value={`${metrics.autoRecoveryRate}%`} />
                <MetricCard title="Revenue at Risk" value={`₦${metrics.totalRevenue.toLocaleString()}`} />
                <MetricCard title="Reconciliation" value={reconStatus} status={reconStatus} />
            </div>

            <div className="card" style={{height: '250px', marginBottom: '24px'}}>
                {renderChart()}
            </div>

            <div className="table-container" style={{marginBottom: '24px'}}>
                <h3 style={{color: 'var(--zinc-400)', fontSize: '0.9rem', marginBottom: '16px'}}>ACTIVE JOBS</h3>
                <table>
                    <thead><tr><th>JOB ID</th><th>TYPE</th><th>STATUS</th></tr></thead>
                    <tbody>
                        {jobs.map(job => (
                            <tr key={job._id}>
                                <td>{job._id}</td>
                                <td>{job.type}</td>
                                <td>{job.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
                        {(logs || []).filter(l => filter === 'all' || l.status === filter).map(log => (
                            <tr key={log._id}>
                                <td>{log._id}</td>
                                <td className={log.status === 'active' ? 'status-active' : 'status-pending glow-pulse'}>
                                    {log.status.toUpperCase()}
                                </td>
                                <td>₦{log.amount}</td>
                                <td>
                                    <button className="action-dropdown" onClick={() => handleAction('retry', log)}>Force Retry</button>
                                    <button className="action-dropdown" onClick={() => handleAction('cancel', log)}>Cancel</button>
                                    <button className="action-dropdown" onClick={() => updateCard(log)}>Update Card</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="card" style={{marginTop: '24px'}}>
                <button className="btn btn-primary" onClick={() => triggerReconcile('TXN-999')}>
                    SIMULATE: TRIGGER REQUERY
                </button>
            </div>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
