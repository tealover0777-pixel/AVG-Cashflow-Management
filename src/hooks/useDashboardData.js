import { useMemo } from 'react';
import { useAuth } from '../AuthContext';

export function useDashboardData({ DEALS = [], CONTRACTS = [], PARTIES = [], SCHEDULES = [], PAYMENTS = [], MONTHLY = [], DIMENSIONS = [] }) {
    const { profile, isSuperAdmin, isTenantAdmin, isMember, isGlobalRole } = useAuth();

    const dashboardData = useMemo(() => {
        // 1. Resolve User Role & Slicing

        // Find the Party record for the member to filter their data
        const myParty = isMember
            ? (PARTIES.find(p => p.id === profile?.party_id || p.email === profile?.email || p.id === (profile?.notes || '').split(' — ')[1]) || { id: profile?.party_id })
            : null;

        const filteredContracts = isMember
            ? CONTRACTS.filter(c => {
                const pId = String(c.party_id || "").trim();
                const targetId = String(myParty?.id || "").trim();
                const targetDocId = String(myParty?.docId || "").trim();
                return pId === targetId || (targetDocId && pId === targetDocId);
            })
            : CONTRACTS;

        const filteredProjects = isMember
            ? PROJECTS.filter(p => filteredContracts.some(c => c.deal_id === p.id))
            : PROJECTS;

        const allFilteredSchedules = isMember
            ? SCHEDULES.filter(s => {
                const pId = String(s.party_id || "").trim();
                const targetId = String(myParty?.id || "").trim();
                const targetDocId = String(myParty?.docId || "").trim();
                const isDirectMatch = pId === targetId || (targetDocId && pId === targetDocId);
                return isDirectMatch || filteredContracts.some(c => c.id === s.contract);
            })
            : SCHEDULES;

        // Derive valid Payment Status values dynamically from Dimensions
        const paymentStatusDim = DIMENSIONS.find(d => d.name === "Payment Status");
        // Statuses considered "zeroed out" — excluded from metric/chart calculations
        const ZEROED_STATUSES = new Set(["Missed", "Cancelled", "VOID", "Waived", "Replaced"]);
        // All valid statuses from Dimensions (or fallback to what's actually in the data)
        const allValidStatuses = paymentStatusDim?.items?.length
            ? new Set(paymentStatusDim.items.map(i => typeof i === 'string' ? i : i.value || i.label || i.name).filter(Boolean))
            : new Set(allFilteredSchedules.map(s => s.status).filter(Boolean));
        // liveStatuses = all valid statuses minus the zeroed-out ones (used for metrics)
        const liveStatuses = [...allValidStatuses].filter(s => !ZEROED_STATUSES.has(s));

        const liveSchedules = allFilteredSchedules.filter(s => liveStatuses.includes(s.status));

        // 2. Calculate Key Metrics
        const totalAUM = filteredContracts.reduce((sum, c) => sum + Number(String(c.amount || 0).replace(/[^0-9.-]/g, '')), 0);

        const totalIncome = liveSchedules
            .filter(s => s.direction === 'IN')
            .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

        const missedPayments = allFilteredSchedules.filter(s => s.status === 'Missed');
        const missedValue = missedPayments.reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

        const activeContracts = filteredContracts.filter(c => c.status === 'Active');
        const avgYield = activeContracts.length > 0
            ? activeContracts.reduce((sum, c) => sum + Number(String(c.rate || 0).replace(/[^0-9.-]/g, '')), 0) / activeContracts.length
            : 0;

        // 2b. Calculate Trends
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const prevAUM = filteredContracts
            .filter(c => {
                const created = new Date(c.created_at);
                return created < startOfThisMonth;
            })
            .reduce((sum, c) => sum + Number(String(c.amount || 0).replace(/[^0-9.-]/g, '')), 0);

        const aumTrend = prevAUM > 0 ? ((totalAUM - prevAUM) / prevAUM) * 100 : 0;

        // 2c. Quick Insights Calculations
        const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const thisMonthStrStart = startOfThisMonth.toISOString().slice(0, 10);
        const thisMonthStrEnd = endOfThisMonth.toISOString().slice(0, 10);

        const thisMonthSchedules = liveSchedules.filter(s => s.dueDate && s.dueDate >= thisMonthStrStart && s.dueDate <= thisMonthStrEnd);

        const dueThisMonthCount = thisMonthSchedules.length;
        const projectedMonthlyIncome = thisMonthSchedules
            .filter(s => s.direction === 'IN')
            .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);
        const projectedMonthlyPayout = thisMonthSchedules
            .filter(s => s.direction === 'OUT')
            .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

        const qEnd = new Date(now.getFullYear(), (Math.floor(now.getMonth() / 3) + 1) * 3, 0);
        const daysUntilQuarterEnd = Math.max(0, Math.ceil((qEnd - now) / (1000 * 60 * 60 * 24)));
        const qLabel = `Q${Math.floor(now.getMonth() / 3) + 1} Wrap`;

        // 3. Prepare Chart Data (Quarterly View)
        const scheduleDates = liveSchedules.map(s => s.dueDate).filter(Boolean);

        // Find date range
        const firstDate = scheduleDates.length
            ? new Date(Math.min(...scheduleDates.map(d => new Date(d))))
            : new Date(now.getFullYear(), now.getMonth(), 1);

        const lastDate = scheduleDates.length
            ? new Date(Math.max(...scheduleDates.map(d => new Date(d))))
            : new Date(now.getFullYear(), now.getMonth() + 11, 1);

        // Round to start of first quarter and end of last quarter
        const startDate = new Date(firstDate.getFullYear(), Math.floor(firstDate.getMonth() / 3) * 3, 1);
        const endDate = new Date(lastDate.getFullYear(), (Math.floor(lastDate.getMonth() / 3) + 1) * 3, 0);

        const quarters = [];
        let curr = new Date(startDate);

        // Ensure at least 4 quarters
        while (curr <= endDate || quarters.length < 4) {
            const qNum = Math.floor(curr.getMonth() / 3) + 1;
            const label = `Q${qNum} ${curr.getFullYear()}`;

            const qStart = new Date(curr.getFullYear(), curr.getMonth(), 1);
            const qEnd = new Date(curr.getFullYear(), curr.getMonth() + 3, 0);
            const qStartStr = qStart.toISOString().slice(0, 10);
            const qEndStr = qEnd.toISOString().slice(0, 10);

            const qSchedules = liveSchedules.filter(s => s.dueDate && s.dueDate >= qStartStr && s.dueDate <= qEndStr);

            const projectedIn = qSchedules
                .filter(s => s.direction === 'IN')
                .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);
            const projectedOut = qSchedules
                .filter(s => s.direction === 'OUT')
                .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

            const actualIn = PAYMENTS
                .filter(p => p.direction === 'Received' && p.date && p.date >= qStartStr && p.date <= qEndStr)
                .reduce((sum, p) => sum + Number(String(p.amount || 0).replace(/[^0-9.-]/g, '')), 0);
            const actualOut = PAYMENTS
                .filter(p => p.direction === 'Disbursed' && p.date && p.date >= qStartStr && p.date <= qEndStr)
                .reduce((sum, p) => sum + Number(String(p.amount || 0).replace(/[^0-9.-]/g, '')), 0);

            quarters.push({
                name: label,
                projectedIn,
                projectedOut: Math.abs(projectedOut),
                actualIn,
                actualOut: Math.abs(actualOut)
            });

            curr.setMonth(curr.getMonth() + 3);
        }

        // 4. Portfolio Diversification by Payment/Transaction Type
        const diversificationMap = {};
        liveSchedules.forEach(s => {
            const type = s.type || 'Other';
            diversificationMap[type] = (diversificationMap[type] || 0) + Number(String(s.payment || 0).replace(/[^0-9.-]/g, ''));
        });
        const pieData = Object.keys(diversificationMap).map(name => ({
            name,
            value: Math.abs(diversificationMap[name])
        })).sort((a, b) => b.value - a.value);

        return {
            metrics: {
                totalAUM,
                totalIncome,
                missedCount: missedPayments.length,
                missedValue,
                avgYield,
                activeContractsCount: activeContracts.length,
                aumTrend,
                dueThisMonthCount,
                projectedMonthlyIncome,
                projectedMonthlyPayout,
                daysUntilQuarterEnd,
                qLabel
            },
            charts: {
                cashflow: quarters,
                diversification: pieData
            },
            recentActivity: allFilteredSchedules
                .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
            contracts: filteredContracts,
            isMember,
            myParty
        };
    }, [PROJECTS, CONTRACTS, PARTIES, SCHEDULES, PAYMENTS, DIMENSIONS, profile, isSuperAdmin, isTenantAdmin, isMember]);

    return dashboardData;
}
