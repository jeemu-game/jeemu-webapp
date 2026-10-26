import React, { useState, useEffect, useMemo } from 'react';
import './AdminPanel.css';

export default function AdminPanel({ onBackToSite }) {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('jeemu_admin_key') || '');
  const [inputKey, setInputKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Data states
  const [subscribers, setSubscribers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Action states
  const [actionLoading, setActionLoading] = useState(null);
  const [alert, setAlert] = useState(null);
  const [testEmail, setTestEmail] = useState('');

  // Auto-login if key is already in session
  useEffect(() => {
    if (adminKey) {
      verifyAndLoad(adminKey);
    }
  }, []);

  const verifyAndLoad = async (keyToTest) => {
    setLoading(true);
    setError('');
    try {
      const [subsRes, metricsRes] = await Promise.all([
        fetch('/api/v1/subscribers', {
          headers: { 'X-Admin-Key': keyToTest, 'Authorization': `Bearer ${keyToTest}` }
        }),
        fetch('/api/v1/telemetry/metrics', {
          headers: { 'X-Admin-Key': keyToTest, 'Authorization': `Bearer ${keyToTest}` }
        })
      ]);

      if (subsRes.status === 401 || subsRes.status === 403 || metricsRes.status === 401 || metricsRes.status === 403) {
        throw new Error('Invalid Admin Key. Access denied.');
      }

      if (!subsRes.ok) {
        throw new Error(`Failed to load data (${subsRes.status})`);
      }

      const subsData = await subsRes.json();
      const metricsData = metricsRes.ok ? await metricsRes.json() : null;

      sessionStorage.setItem('jeemu_admin_key', keyToTest);
      setAdminKey(keyToTest);
      setIsAuthenticated(true);
      setSubscribers(subsData.subscribers || []);
      setMetrics(metricsData);
    } catch (err) {
      sessionStorage.removeItem('jeemu_admin_key');
      setIsAuthenticated(false);
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setError('Please enter the Admin Key.');
      return;
    }
    verifyAndLoad(inputKey.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('jeemu_admin_key');
    setAdminKey('');
    setInputKey('');
    setIsAuthenticated(false);
    setSubscribers([]);
    setMetrics(null);
    setAlert(null);
  };

  // Quick Action: Export CSV
  const handleExportCsv = async () => {
    setActionLoading('export');
    setAlert(null);
    try {
      const res = await fetch('/api/v1/admin/subscribers/export', {
        headers: { 'X-Admin-Key': adminKey, 'Authorization': `Bearer ${adminKey}` }
      });
      if (!res.ok) throw new Error('Failed to generate CSV export');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jeemu_subscribers_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setAlert({ type: 'success', text: 'Subscribers CSV downloaded successfully.' });
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Quick Action: Sync to Google Sheets
  const handleSyncSheets = async () => {
    setActionLoading('sync');
    setAlert(null);
    try {
      const res = await fetch('/api/v1/admin/sync-google-sheet', {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey, 'Authorization': `Bearer ${adminKey}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync Google Sheets');
      setAlert({ type: 'success', text: `Google Sheets synced successfully! (${data.count || 0} subscribers updated)` });
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Quick Action: Check SMTP Status
  const handleCheckSmtp = async () => {
    setActionLoading('smtp');
    setAlert(null);
    try {
      const res = await fetch('/api/v1/admin/smtp-status', {
        headers: { 'X-Admin-Key': adminKey, 'Authorization': `Bearer ${adminKey}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check SMTP status');
      const diag = data.diagnostics || {};
      const statusText = diag.connected
        ? `Hostinger SMTP is CONNECTED and authenticated. (${diag.message || 'OK'})`
        : `SMTP connection alert: ${diag.error || 'Not connected'}`;
      setAlert({ type: diag.connected ? 'success' : 'info', text: statusText });
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Quick Action: Send Test Email
  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      setAlert({ type: 'error', text: 'Please enter a valid recipient email address.' });
      return;
    }
    setActionLoading('testEmail');
    setAlert(null);
    try {
      const res = await fetch('/api/v1/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
          'Authorization': `Bearer ${adminKey}`
        },
        body: JSON.stringify({ targetEmail: testEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.details?.error || 'Test email failed');
      setAlert({ type: 'success', text: `Test confirmation email dispatched to ${testEmail}!` });
      setTestEmail('');
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Calculated KPIs
  const totalCount = subscribers.length;
  const vipCount = subscribers.filter(s => s.isVip || s.depositAmount > 0).length;
  const totalRevenue = subscribers.reduce((acc, s) => acc + (Number(s.depositAmount) || 0), 0);
  const totalReferrals = subscribers.reduce((acc, s) => acc + (Number(s.friendsReferred) || 0), 0);
  const unsubCount = subscribers.filter(s => s.unsubscribed).length;
  const conversionRate = totalCount > 0 ? ((vipCount / totalCount) * 100).toFixed(1) : '0.0';

  // Filtered subscribers list
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(s => {
      // Filter tab
      if (filter === 'vip' && !s.isVip && s.depositAmount <= 0) return false;
      if (filter === 'referrers' && (!s.friendsReferred || s.friendsReferred <= 0)) return false;
      if (filter === 'unsub' && !s.unsubscribed) return false;

      // Search term
      if (search.trim()) {
        const q = search.toLowerCase();
        const email = (s.email || '').toLowerCase();
        const name = (s.name || '').toLowerCase();
        const ref = (s.referralCode || '').toLowerCase();
        const referredBy = (s.referredBy || '').toLowerCase();
        return email.includes(q) || name.includes(q) || ref.includes(q) || referredBy.includes(q);
      }
      return true;
    });
  }, [subscribers, filter, search]);

  // If not authenticated, render login form
  if (!isAuthenticated) {
    return (
      <div className="admin-wrapper admin-login-wrapper">
        <div className="admin-login-card">
          <span className="admin-login-icon">🔒</span>
          <span className="admin-badge">JEEMU ADMIN CONSOLE</span>
          <h2>Team Authentication</h2>
          <p>Enter the master admin key or password to access live backer metrics and diagnostic tools.</p>

          <form onSubmit={handleLogin}>
            <div className="admin-input-group">
              <label htmlFor="adminKeyInput">Admin Password / Key</label>
              <input
                id="adminKeyInput"
                type="password"
                className="admin-input"
                placeholder="Enter ADMIN_PASSWORD..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                autoFocus
              />
            </div>

            {error && <div className="admin-error-box">{error}</div>}

            <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Authenticating…' : 'Unlock Dashboard'}
            </button>
          </form>

          <div style={{ marginTop: '24px' }}>
            <button
              type="button"
              className="admin-btn"
              style={{ fontSize: '0.8rem', opacity: 0.8 }}
              onClick={onBackToSite || (() => window.location.assign('/'))}
            >
              ← Back to Main Game Site
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wrapper">
      <div className="admin-container">
        {/* Top Bar */}
        <header className="admin-header">
          <div className="admin-brand">
            <h1 className="admin-title">JEEMU</h1>
            <span className="admin-badge">ADMIN CONSOLE</span>
          </div>
          <div className="admin-nav-actions">
            <button
              className="admin-btn"
              onClick={() => verifyAndLoad(adminKey)}
              disabled={loading}
              title="Refresh all metrics"
            >
              {loading ? '↻ Refreshing…' : '↻ Refresh Data'}
            </button>
            <button
              className="admin-btn"
              onClick={onBackToSite || (() => window.location.assign('/'))}
            >
              ⌂ Game Site
            </button>
            <button
              className="admin-btn admin-btn-danger"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Global Notification Banner */}
        {alert && (
          <div className={`admin-alert ${alert.type === 'error' ? 'admin-error-box' : alert.type}`} style={{ marginBottom: '24px' }}>
            <span>{alert.text}</span>
            <button
              type="button"
              onClick={() => setAlert(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="admin-kpis">
          <div className="kpi-card">
            <div className="kpi-label">Total Backers</div>
            <div className="kpi-value highlight">{totalCount}</div>
            <div className="kpi-sub">{unsubCount} unsubscribed ({totalCount - unsubCount} active)</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">VIP Early Birds ($1)</div>
            <div className="kpi-value highlight">{vipCount}</div>
            <div className="kpi-sub">{conversionRate}% conversion rate</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">VIP Deposit Volume</div>
            <div className="kpi-value">${totalRevenue.toFixed(2)}</div>
            <div className="kpi-sub">Total verified Stripe deposits</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Referral Network</div>
            <div className="kpi-value">{totalReferrals}</div>
            <div className="kpi-sub">Total successful friend invites</div>
          </div>
        </div>

        {/* Operations & Diagnostic Actions */}
        <div className="admin-actions-card">
          <h3>Operations & Cloud Sync</h3>
          <div className="admin-action-buttons">
            <button
              className="admin-btn admin-btn-primary"
              onClick={handleExportCsv}
              disabled={actionLoading === 'export'}
            >
              {actionLoading === 'export' ? 'Generating…' : '📥 Download CSV Roster'}
            </button>

            <button
              className="admin-btn"
              onClick={handleSyncSheets}
              disabled={actionLoading === 'sync'}
            >
              {actionLoading === 'sync' ? 'Syncing…' : '📊 Sync to Google Sheet'}
            </button>

            <button
              className="admin-btn"
              onClick={handleCheckSmtp}
              disabled={actionLoading === 'smtp'}
            >
              {actionLoading === 'smtp' ? 'Testing…' : '⚡ Test SMTP & Sheets Status'}
            </button>
          </div>

          {/* Test Email Dispatch */}
          <form className="email-test-form" onSubmit={handleSendTestEmail}>
            <input
              type="email"
              className="admin-input"
              placeholder="recipient@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <button
              type="submit"
              className="admin-btn"
              disabled={actionLoading === 'testEmail' || !testEmail}
            >
              {actionLoading === 'testEmail' ? 'Sending…' : '✉ Send Test Welcome Email'}
            </button>
          </form>
        </div>

        {/* Backer Roster Table */}
        <div className="admin-table-section">
          <div className="table-toolbar">
            <div className="search-box">
              <input
                type="text"
                className="admin-input"
                placeholder="Search by email, name, or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-chips">
              <button
                className={`chip ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({totalCount})
              </button>
              <button
                className={`chip ${filter === 'vip' ? 'active' : ''}`}
                onClick={() => setFilter('vip')}
              >
                VIP Backers ({vipCount})
              </button>
              <button
                className={`chip ${filter === 'referrers' ? 'active' : ''}`}
                onClick={() => setFilter('referrers')}
              >
                Top Referrers
              </button>
              <button
                className={`chip ${filter === 'unsub' ? 'active' : ''}`}
                onClick={() => setFilter('unsub')}
              >
                Unsubscribed ({unsubCount})
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Joined</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Referral Code</th>
                  <th>Referred By</th>
                  <th>Status</th>
                  <th>Invited</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No backers match the selected search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map((s) => {
                    const dateStr = s.timestamp ? new Date(s.timestamp).toLocaleDateString() : '—';
                    return (
                      <tr key={s.id || s.email}>
                        <td>{dateStr}</td>
                        <td style={{ color: 'var(--text-white)' }}>{s.name || 'Backer'}</td>
                        <td>{s.email}</td>
                        <td>
                          <span style={{ color: 'var(--jade-primary)', fontWeight: 600 }}>
                            {s.referralCode || '—'}
                          </span>
                        </td>
                        <td style={{ color: s.referredBy ? 'var(--text-main)' : 'var(--text-faint)' }}>
                          {s.referredBy || 'None'}
                        </td>
                        <td>
                          {s.isVip || s.depositAmount > 0 ? (
                            <span className="vip-pill">★ VIP ($1)</span>
                          ) : s.unsubscribed ? (
                            <span className="unsub-pill">Unsubscribed</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Standard</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {s.friendsReferred || 0}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
