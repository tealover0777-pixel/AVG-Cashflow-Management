import { useMemo } from 'react';
import { useAuth } from '../AuthContext';

export function useDashboardData({ PROJECTS = [], CONTRACTS = [], PARTIES = [], SCHEDULES = [], PAYMENTS = [], MONTHLY = [] }) {
    const { profile, isSuperAdmin, isTenantAdmin, isGlobalRole } = useAuth();

    const dashboardData = useMemo(() => {
        // 1. Resolve User Role & Slicing
        // If not admin, they are a Member.
        const isMember = !isSuperAdmin && !isTenantAdmin;

        // Find the Party record for the member to filter their data
        const myParty = isMember
            ? PARTIES.find(p => p.email === profile?.email || p.id === (profile?.notes || '').split(' — ')[1])
            : null;

        const filteredContracts = isMember
            ? CONTRACTS.filter(c => c.party_id === myParty?.id)
            : CONTRACTS;

        const filteredProjects = isMember
            ? PROJECTS.filter(p => filteredContracts.some(c => c.project_id === p.id))
            : PROJECTS;

        const filteredSchedules = isMember
            ? SCHEDULES.filter(s => s.party_id === myParty?.id)
            : SCHEDULES;

        // 2. Calculate Key Metrics
        const totalAUM = PAYMENTS.reduce((sum, p) => sum + Number(String(p.amount || 0).replace(/[^0-9.-]/g, '')), 0);

        const totalIncome = filteredSchedules
            .filter(s => s.status === 'Paid')
            .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

        const missedPayments = filteredSchedules.filter(s => s.status === 'Missed');
        const missedValue = missedPayments.reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

        const activeContracts = filteredContracts.filter(c => c.status === 'Active');
        const avgYield = activeContracts.length > 0
            ? activeContracts.reduce((sum, c) => sum + Number(String(c.rate || 0).replace(/[^0-9.-]/g, '')), 0) / activeContracts.length
            : 0;

        // 3. Prepare Chart Data (Next 12 Months)
        const now = new Date();
        const months = [];
        for (let i = 0; i < 8; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const label = d.toLocaleString('default', { month: 'short' });
            const monthKey = d.toISOString().slice(0, 7); // YYYY-MM

            const monthlySchedules = filteredSchedules.filter(s => s.dueDate && s.dueDate.startsWith(monthKey));
            const projected = monthlySchedules.reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);
            const actual = monthlySchedules
                .filter(s => s.status === 'Paid')
                .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

            months.push({ name: label, projected, actual });
        }

        // 4. Portfolio Diversification
        const diversification = {};
        filteredProjects.forEach(p => {
            const type = p.type || 'Other';
            diversification[type] = (diversification[type] || 0) + 1;
        });
        const pieData = Object.keys(diversification).map(name => ({
            name,
            value: diversification[name]
        }));

        return {
            metrics: {
                totalAUM,
                totalIncome,
                missedCount: missedPayments.length,
                missedValue,
                avgYield,
                activeContractsCount: activeContracts.length
            },
            charts: {
                cashflow: months,
                diversification: pieData
            },
            recentActivity: filteredSchedules
                .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
                .slice(0, 5),
            isMember,
            myParty
        };
    }, [PROJECTS, CONTRACTS, PARTIES, SCHEDULES, PAYMENTS, profile, isSuperAdmin, isTenantAdmin]);

    return dashboardData;
}
