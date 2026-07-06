const { useState, useEffect, useMemo } = React;
// Safely access Recharts components
const { ResponsiveContainer, AreaChart, Area } = window.Recharts || {};

// Dynamically set backend URL for local vs production
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : 'https://nomba.onrender.com';


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
    const [subscriptions, setSubscriptions] = useState([]);
    const [metrics, setMetrics] = useState({ 
        totalRevenue: 0, 
        churnRiskRate: 0, 
        autoRecoveryRate: 0,
        totalAttempts: 0,
        totalFailures: 0,
        pendingAuth: 0,
        successfulRecoveries: 0
    });
    const [jobs, setJobs] = useState([]);
    const [failureTrends, setFailureTrends] = useState([]);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [filter, setFilter] = useState('all');
    const [reconStatus, setReconStatus] = useState('Synced');

    const fetchData = async () => {
        try {
            const [data, metricsData, jobsData, trendsData] = await Promise.all([
                NombaClient.request('/portal/507f1f1f8b1d4b0003b51616'),
                NombaClient.request('/analytics/metrics'),
                NombaClient.request('/analytics/jobs?status=pending'),
                NombaClient.request('/analytics/failure-trends')
            ]);
            setLogs(data.logs || []);
            setSubscriptions(data.subscriptions || []);
            setMetrics(metricsData);
            setJobs(jobsData || []);
            setFailureTrends(trendsData || []);
        } catch (e) { console.error("Fetch error:", e); }
    };

    useEffect(() => {
        fetchData();
        
        const eventSource = new EventSource(`${BACKEND_URL}/api/events`);
        eventSource.onmessage = (event) => {
            console.log("Real-time update received");
            fetchData();
        };
        
        return () => eventSource.close();
    }, []);

    const triggerReconcile = async (sessionId) => {
        setReconStatus('Reconciling...');
        try {
            await NombaClient.request(`/subscriptions/requery/${sessionId}`, { method: 'GET' });
        } catch (e) { console.error(e); }
        setTimeout(() => setReconStatus('Synced'), 1500);
        fetchData();
    };

    const handleAction = async (action, transaction) => {
        try {
            let res;
            if (action === 'cancel') {
                res = await NombaClient.request('/subscriptions/cancel', {
                    method: 'POST',
                    body: JSON.stringify({ orderReference: transaction._id })
                });
            } else {
                res = await NombaClient.request('/portal/retry-auth', {
                    method: 'POST',
                    body: JSON.stringify({ subscriptionId: transaction._id, status: action === 'retry' ? 'approved' : 'declined' })
                });
            }
            
            if (res && (res.error || (res.message && res.message.includes('Failed')))) {
                alert(`Action Failed: ${res.error || res.message}`);
            } else {
                fetchData();
            }
        } catch (e) { console.error("Action error:", e); alert("Action Failed: Unexpected error"); }
    };

    const updateCard = async (transaction) => {
        if (!transaction.tokenKey) {
            alert('Update Failed: Token Key is missing for this transaction.');
            return;
        }

        try {
            const currentEmail = prompt("Enter current email:");
            if (!currentEmail || currentEmail.trim() === "") {
                alert('Update Failed: Current email is required.');
                return;
            }
            const newEmail = prompt("Enter new email:");
            if (!newEmail || newEmail.trim() === "") {
                alert('Update Failed: New email is required.');
                return;
            }

            const res = await NombaClient.request('/subscriptions/update-tokenized-card', {
                method: 'POST',
                body: JSON.stringify({ tokenKey: transaction.tokenKey, currentEmailAddress: currentEmail, newEmailAddress: newEmail })
            });
            
            if (res && (res.error || (res.message && res.message.includes('Failed')))) {
                alert(`Update Failed: ${res.error || res.message}`);
            } else {
                alert('Card updated');
                fetchData();
            }
        } catch (e) { console.error("Update card error:", e); alert("Update Failed: Unexpected error"); }
    };

    const renderChart = () => {
        const total = ((metrics && metrics.totalAttempts) || 0) || 1;
        const failurePct = (((metrics && metrics.totalFailures) || 0) / total) * 100;
        const authReqPct = (((metrics && metrics.pendingAuth) || 0) / total) * 100;
        const recoveredPct = (((metrics && metrics.successfulRecoveries) || 0) / total) * 100;

        const funnel = [
            { name: 'Attempts', value: 100, color: '#0ea5e9' },
            { name: 'Failures', value: failurePct, color: '#f59e0b' },
            { name: 'AuthReq', value: authReqPct, color: '#8b5cf6' },
            { name: 'Recovered', value: recoveredPct, color: '#10b981' }
        ];

        return (
            <div style={{display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-around', padding: '10px 0'}}>
                {funnel.map((item) => (
                    <div key={item.name} style={{display: 'flex', alignItems: 'center', height: '30px'}}>
                        <div style={{width: '80px', fontSize: '0.8rem', color: 'var(--zinc-400)'}}>{item.name}</div>
                        <div style={{flexGrow: 1, height: '100%', backgroundColor: 'var(--zinc-800)', borderRadius: '4px', overflow: 'hidden'}}>
                            <div style={{width: `${item.value}%`, height: '100%', backgroundColor: item.color, transition: 'width 0.5s'}}></div>
                        </div>
                        <div style={{width: '40px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 'bold'}}>{Math.round(item.value)}%</div>
                    </div>
                ))}
            </div>
        );
    };

    const openTransactionDetails = async (log) => {
        const res = await NombaClient.request(`/analytics/transaction-details/${log._id}`);
        setSelectedTransaction(res);
    };

    const formatDuration = (createdAt) => {
        const start = new Date(createdAt);
        const now = new Date();
        const diffMs = now - start;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffDays > 0) return `${diffDays}d`;
        if (diffHours > 0) return `${diffHours}h`;
        return `${diffMinutes}m`;
    };

    const createSubscription = async () => {
        try {
            const res = await NombaClient.request('/subscriptions', {
                method: 'POST',
                body: JSON.stringify({
                    userId: '507f1f1f8b1d4b0003b51616',
                    tokenKey: 'tok_' + Math.random().toString(36).substr(2, 9),
                    amount: 5000,
                    billingCycle: 'monthly'
                })
            });
            
            if (res && res.message) {
                alert(res.message);
            }
            fetchData();
        } catch (e) { 
            console.error("Create subscription error:", e); 
            alert("Failed to create subscription");
        }
    };

    const triggerFailure = async (type) => {
        try {
            await NombaClient.request('/test/simulate-failure', {
                method: 'POST',
                body: JSON.stringify({ type })
            });
            alert(`Simulated ${type} failure successfully!`);
            fetchData();
        } catch (e) { 
            console.error("Sim error:", e); 
            alert(`Simulation failed: ${e.message}`);
        }
    };

    const TransactionDetailPanel = ({ data, onClose }) => {
        if (!data) return null;
        return (
            <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
                <div className="card" style={{width: '80%', maxWidth: '600px', maxHeight: '80%', overflowY: 'auto'}}>
                    <h3>Transaction Audit: {data.log._id}</h3>
                    <p>Status: {data.log.status}</p>
                    <p>Amount: ₦{data.log.amount}</p>
                    <h4>Retry Jobs</h4>
                    <ul>{data.jobs.map(j => <li key={j._id}>{j.type} - {j.status}</li>)}</ul>
                    <h4>Auth Requests</h4>
                    <ul>{data.authReqs.map(a => <li key={a._id}>{a.authStatus}</li>)}</ul>
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
        );
    };

    const SystemAlertCard = ({ trends }) => {
        const alerts = trends.filter(t => t.count > 0);
        if (alerts.length === 0) return null;
        return (
            <div className="card" style={{backgroundColor: '#ef4444', color: 'white', marginBottom: '24px'}}>
                <h3>⚠️ System Alert</h3>
                {alerts.map(a => <p key={a._id}>{a.count} failures for category: {a._id}</p>)}
            </div>
        );
    };

    return (
        <div className="dashboard">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h1 style={{fontSize: '1.2rem', color: 'var(--zinc-400)', marginBottom: '32px'}}>NOMBA // ORCHESTRATOR // TERMINAL</h1>
                <div className="card" style={{padding: '8px 16px', fontSize: '0.8rem', color: 'var(--emerald-500)', border: '1px solid var(--emerald-500)'}}>
                    SYSTEM CONSISTENCY: IDEMPOTENCY CONFLICTS: 0
                </div>
            </div>
            
            <SystemAlertCard trends={failureTrends} />
            
            <div className="card" style={{marginBottom: '24px'}}>
                <h3 style={{marginBottom: '16px'}}>SIMULATION CONTROLS</h3>
                <div style={{display: 'flex', gap: '10px'}}>
                    <button className="btn btn-primary" onClick={() => triggerFailure('network')}>SIMULATE: NETWORK FAILURE</button>
                    <button className="btn btn-primary" onClick={() => triggerFailure('funds')}>SIMULATE: INSUFFICIENT FUNDS</button>
                    <button className="btn btn-primary" onClick={() => triggerFailure('expired')}>SIMULATE: EXPIRED CARD</button>
                    <button className="btn btn-primary" onClick={createSubscription}>CREATE SUBSCRIPTION</button>
                </div>
            </div>
            
            <div className="card-grid">
                <MetricCard title="Auto-Recovery Rate" value={`${(metrics && metrics.autoRecoveryRate) || 0}%`} />
                <MetricCard title="Revenue at Risk" value={`₦${((metrics && metrics.totalRevenue) || 0).toLocaleString()}`} />
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
                    <thead><tr><th>ID</th><th>STATUS</th><th>AMOUNT</th><th>DURATION</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                        {(logs || []).filter(l => {
                            const sub = subscriptions.find(s => s._id === l.subscriptionId);
                            const statusMatchesFilter = filter === 'all' || (sub && sub.status === filter);
                            return statusMatchesFilter;
                        }).map(log => {
                            const sub = subscriptions.find(s => s._id === log.subscriptionId);
                            const displayStatus = sub ? sub.status : log.status;
                            return (
                            <tr key={log._id}>
                                <td onClick={() => openTransactionDetails(log)} style={{cursor: 'pointer', color: '#0ea5e9'}}>{log._id}</td>
                                <td className={displayStatus === 'active' ? 'status-active' : 'status-pending glow-pulse'}>
                                    {displayStatus.toUpperCase()}
                                </td>
                                <td>₦{log.amount}</td>
                                <td>{sub ? formatDuration(sub.createdAt) : '-'}</td>
                                <td>
                                    {displayStatus === 'pending_auth' && (
                                        <button className="action-dropdown" onClick={() => handleAction('retry', log)}>Force Retry</button>
                                    )}
                                    {(displayStatus === 'active' || displayStatus === 'pending') && (
                                        <button className="action-dropdown" onClick={() => handleAction('cancel', log)}>Cancel</button>
                                    )}
                                    <button className="action-dropdown" onClick={() => updateCard(log)}>Update Card</button>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            <TransactionDetailPanel data={selectedTransaction} onClose={() => setSelectedTransaction(null)} />
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
