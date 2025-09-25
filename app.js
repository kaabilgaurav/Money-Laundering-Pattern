// AML Dashboard Application
class AMLDashboard {
    constructor() {
        this.transactions = [];
        this.alerts = [];
        this.patterns = new Map();
        this.isRunning = true;
        this.totalProcessed = 0;
        
        // Data from JSON
        this.amlPatterns = [
            {"type": "Structuring", "description": "Breaking large amounts into smaller transactions to avoid reporting thresholds", "riskLevel": "High"},
            {"type": "Layering", "description": "Complex series of transactions to obscure money trail", "riskLevel": "Critical"},
            {"type": "Smurfing", "description": "Using multiple individuals to conduct smaller transactions", "riskLevel": "High"},
            {"type": "Large Cash", "description": "Unusually large cash transactions inconsistent with customer profile", "riskLevel": "Medium"},
            {"type": "Geographic Risk", "description": "Transactions involving high-risk jurisdictions", "riskLevel": "Medium"},
            {"type": "Velocity", "description": "High frequency transactions in short time period", "riskLevel": "High"},
            {"type": "Round Amount", "description": "Suspicious use of round numbers", "riskLevel": "Low"}
        ];
        
        this.currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "BTC", "ETH"];
        this.paymentMethods = ["Wire Transfer", "Cash Deposit", "ACH", "Credit Card", "Cryptocurrency", "Check", "Money Order"];
        this.highRiskCountries = ["North Korea", "Iran", "Afghanistan", "Myanmar", "Syria", "Somalia", "Yemen", "Libya"];
        this.locations = ["New York, USA", "London, UK", "Singapore", "Dubai, UAE", "Hong Kong", "Switzerland", "Cayman Islands", "Bahamas", "Panama", "Cyprus"];
        
        this.charts = {};
        this.filters = {
            riskLevel: 'all',
            pattern: 'all'
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.initializePatterns();
        this.startTransactionGeneration();
        this.updateDisplays();
    }

    setupEventListeners() {
        // Filter controls
        document.getElementById('riskFilter').addEventListener('change', (e) => {
            this.filters.riskLevel = e.target.value;
            this.updateTransactionDisplay();
        });

        document.getElementById('patternFilter').addEventListener('change', (e) => {
            this.filters.pattern = e.target.value;
            this.updateTransactionDisplay();
        });

        // Control buttons
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportSAR();
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('acknowledgeBtn').addEventListener('click', () => {
            this.acknowledgeAlert();
        });

        document.getElementById('investigateBtn').addEventListener('click', () => {
            this.investigateTransaction();
        });

        // Click outside modal to close
        document.getElementById('transactionModal').addEventListener('click', (e) => {
            if (e.target.id === 'transactionModal') {
                this.closeModal();
            }
        });
    }

    generateTransaction() {
        const id = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const timestamp = new Date();
        const amount = this.generateAmount();
        const currency = this.currencies[Math.floor(Math.random() * this.currencies.length)];
        const paymentMethod = this.paymentMethods[Math.floor(Math.random() * this.paymentMethods.length)];
        const senderLocation = this.locations[Math.floor(Math.random() * this.locations.length)];
        const receiverLocation = this.locations[Math.floor(Math.random() * this.locations.length)];
        
        const transaction = {
            id,
            timestamp,
            amount,
            currency,
            paymentMethod,
            sender: this.generatePersonData(),
            receiver: this.generatePersonData(),
            senderLocation,
            receiverLocation,
            riskScore: 0,
            riskLevel: 'Low',
            patterns: [],
            riskFactors: []
        };

        // Calculate risk score and detect patterns
        this.analyzeTransaction(transaction);
        
        return transaction;
    }

    generateAmount() {
        const random = Math.random();
        if (random < 0.1) {
            // Suspicious round amounts
            return Math.floor(Math.random() * 50) * 1000;
        } else if (random < 0.15) {
            // Just under reporting threshold
            return 9000 + Math.random() * 999;
        } else if (random < 0.2) {
            // Large amounts
            return 50000 + Math.random() * 450000;
        } else {
            // Normal amounts
            return Math.random() * 10000 + 100;
        }
    }

    generatePersonData() {
        const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Maria'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
        
        return {
            name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
            account: `ACC${Math.floor(Math.random() * 1000000000)}`,
            type: Math.random() > 0.8 ? 'Business' : 'Individual'
        };
    }

    analyzeTransaction(transaction) {
        let riskScore = 0;
        const riskFactors = [];

        // Amount-based risk
        if (transaction.amount > 100000) {
            riskScore += 30;
            riskFactors.push('Large amount transaction');
        }

        // Round amount detection
        if (transaction.amount % 1000 === 0 && transaction.amount > 5000) {
            riskScore += 15;
            riskFactors.push('Suspicious round amount');
            transaction.patterns.push('Round Amount');
        }

        // Just-under-threshold detection
        if (transaction.amount >= 9000 && transaction.amount < 10000) {
            riskScore += 40;
            riskFactors.push('Amount just under reporting threshold');
            transaction.patterns.push('Structuring');
        }

        // Geographic risk
        if (this.highRiskCountries.some(country => 
            transaction.senderLocation.includes(country) || 
            transaction.receiverLocation.includes(country))) {
            riskScore += 25;
            riskFactors.push('High-risk jurisdiction involved');
            transaction.patterns.push('Geographic Risk');
        }

        // Cash transaction risk
        if (transaction.paymentMethod === 'Cash Deposit' && transaction.amount > 5000) {
            riskScore += 20;
            riskFactors.push('Large cash transaction');
            transaction.patterns.push('Large Cash');
        }

        // Cryptocurrency risk
        if (transaction.paymentMethod === 'Cryptocurrency') {
            riskScore += 15;
            riskFactors.push('Cryptocurrency transaction');
        }

        // Velocity check (simulate)
        if (this.checkVelocity(transaction)) {
            riskScore += 35;
            riskFactors.push('High transaction velocity detected');
            transaction.patterns.push('Velocity');
        }

        // Layering detection (simulate complex patterns)
        if (Math.random() < 0.05) {
            riskScore += 50;
            riskFactors.push('Complex layering pattern detected');
            transaction.patterns.push('Layering');
        }

        // Smurfing detection (simulate)
        if (Math.random() < 0.03) {
            riskScore += 45;
            riskFactors.push('Potential smurfing activity');
            transaction.patterns.push('Smurfing');
        }

        // Apply randomness for realism
        riskScore += Math.random() * 10 - 5;
        riskScore = Math.max(1, Math.min(100, Math.floor(riskScore)));

        transaction.riskScore = riskScore;
        transaction.riskFactors = riskFactors;

        // Determine risk level
        if (riskScore >= 76) {
            transaction.riskLevel = 'Critical';
        } else if (riskScore >= 51) {
            transaction.riskLevel = 'High';
        } else if (riskScore >= 26) {
            transaction.riskLevel = 'Medium';
        } else {
            transaction.riskLevel = 'Low';
        }

        // Generate alerts for high-risk transactions
        if (riskScore >= 51) {
            this.generateAlert(transaction);
        }

        // Update pattern counts
        transaction.patterns.forEach(pattern => {
            const current = this.patterns.get(pattern) || 0;
            this.patterns.set(pattern, current + 1);
        });
    }

    checkVelocity(transaction) {
        // Simple velocity check - count recent transactions from same account
        const recentTransactions = this.transactions.filter(t => 
            t.sender.account === transaction.sender.account &&
            (Date.now() - t.timestamp.getTime()) < 3600000 // Last hour
        );
        return recentTransactions.length > 5;
    }

    generateAlert(transaction) {
        const alertTypes = [
            {"type": "Suspicious Pattern", "icon": "⚠️", "priority": "high"},
            {"type": "Threshold Exceeded", "icon": "📊", "priority": "medium"},
            {"type": "Geographic Risk", "icon": "🌍", "priority": "medium"},
            {"type": "Velocity Alert", "icon": "⚡", "priority": "high"},
            {"type": "Customer Risk", "icon": "👤", "priority": "high"}
        ];

        const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        
        const alert = {
            id: `ALT${Date.now()}${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date(),
            transactionId: transaction.id,
            type: alertType.type,
            icon: alertType.icon,
            priority: alertType.priority,
            description: this.generateAlertDescription(transaction),
            acknowledged: false
        };

        this.alerts.unshift(alert);
        
        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(0, 50);
        }
    }

    generateAlertDescription(transaction) {
        const descriptions = [
            `High-risk transaction detected: ${transaction.currency} ${transaction.amount.toLocaleString()}`,
            `Suspicious pattern identified in transaction from ${transaction.senderLocation}`,
            `Multiple risk factors detected in ${transaction.paymentMethod} transaction`,
            `Velocity threshold exceeded for account ${transaction.sender.account.slice(-6)}`,
            `Geographic risk alert: transaction involves high-risk jurisdiction`
        ];
        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }

    addTransaction(transaction) {
        this.transactions.unshift(transaction);
        this.totalProcessed++;
        
        // Keep only last 100 transactions in memory
        if (this.transactions.length > 100) {
            this.transactions = this.transactions.slice(0, 100);
        }

        this.updateTransactionDisplay();
        this.updateStats();
        this.updateCharts();
        this.updatePatternDisplay();
    }

    updateTransactionDisplay() {
        const container = document.getElementById('transactionList');
        const filteredTransactions = this.filterTransactions();
        
        container.innerHTML = '';
        
        filteredTransactions.slice(0, 20).forEach(transaction => {
            const item = this.createTransactionElement(transaction);
            container.appendChild(item);
        });
    }

    filterTransactions() {
        return this.transactions.filter(transaction => {
            const riskMatch = this.filters.riskLevel === 'all' || transaction.riskLevel === this.filters.riskLevel;
            const patternMatch = this.filters.pattern === 'all' || transaction.patterns.includes(this.filters.pattern);
            return riskMatch && patternMatch;
        });
    }

    createTransactionElement(transaction) {
        const div = document.createElement('div');
        div.className = `transaction-item ${transaction.riskLevel.toLowerCase()}`;
        div.setAttribute('data-transaction-id', transaction.id);
        
        div.innerHTML = `
            <div class="transaction-header">
                <span class="transaction-id">${transaction.id}</span>
                <span class="risk-score ${transaction.riskLevel.toLowerCase()}">${transaction.riskScore}</span>
            </div>
            <div class="transaction-details">
                <div class="transaction-amount">${transaction.currency} ${transaction.amount.toLocaleString()}</div>
                <div>${transaction.paymentMethod}</div>
                <div>${transaction.senderLocation}</div>
                <div class="transaction-pattern">${transaction.patterns.join(', ') || 'Normal'}</div>
            </div>
        `;

        div.addEventListener('click', () => {
            this.showTransactionDetails(transaction);
        });

        return div;
    }

    showTransactionDetails(transaction) {
        const modal = document.getElementById('transactionModal');
        const content = document.getElementById('modalContent');
        
        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-section">
                    <h4>Transaction Information</h4>
                    <div class="detail-row">
                        <span class="detail-label">Transaction ID:</span>
                        <span class="detail-value">${transaction.id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Timestamp:</span>
                        <span class="detail-value">${transaction.timestamp.toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value">${transaction.currency} ${transaction.amount.toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Method:</span>
                        <span class="detail-value">${transaction.paymentMethod}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Parties Involved</h4>
                    <div class="detail-row">
                        <span class="detail-label">Sender:</span>
                        <span class="detail-value">${transaction.sender.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Sender Account:</span>
                        <span class="detail-value">${transaction.sender.account}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Receiver:</span>
                        <span class="detail-value">${transaction.receiver.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Receiver Account:</span>
                        <span class="detail-value">${transaction.receiver.account}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Geographic Information</h4>
                    <div class="detail-row">
                        <span class="detail-label">Sender Location:</span>
                        <span class="detail-value">${transaction.senderLocation}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Receiver Location:</span>
                        <span class="detail-value">${transaction.receiverLocation}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Risk Assessment</h4>
                    <div class="detail-row">
                        <span class="detail-label">Risk Score:</span>
                        <span class="detail-value risk-score ${transaction.riskLevel.toLowerCase()}">${transaction.riskScore}/100</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Risk Level:</span>
                        <span class="detail-value">${transaction.riskLevel}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Patterns:</span>
                        <span class="detail-value">${transaction.patterns.join(', ') || 'None'}</span>
                    </div>
                </div>
            </div>
            
            ${transaction.riskFactors.length > 0 ? `
                <div class="risk-analysis">
                    <h4>⚠️ Risk Factors Identified</h4>
                    <ul class="risk-factors">
                        ${transaction.riskFactors.map(factor => `<li>${factor}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;

        modal.classList.remove('hidden');
        modal.setAttribute('data-transaction-id', transaction.id);
    }

    closeModal() {
        document.getElementById('transactionModal').classList.add('hidden');
    }

    acknowledgeAlert() {
        const transactionId = document.getElementById('transactionModal').getAttribute('data-transaction-id');
        const alert = this.alerts.find(a => a.transactionId === transactionId);
        if (alert) {
            alert.acknowledged = true;
            this.updateAlertDisplay();
        }
        this.closeModal();
    }

    investigateTransaction() {
        // Simulate investigation action
        alert('Investigation initiated. Transaction flagged for detailed review.');
        this.acknowledgeAlert();
    }

    updateAlertDisplay() {
        const container = document.getElementById('alertsList');
        const activeAlerts = this.alerts.filter(alert => !alert.acknowledged).slice(0, 10);
        
        container.innerHTML = '';
        
        activeAlerts.forEach(alert => {
            const item = this.createAlertElement(alert);
            container.appendChild(item);
        });

        document.getElementById('activeAlerts').textContent = `${activeAlerts.length} Active`;
    }

    createAlertElement(alert) {
        const div = document.createElement('div');
        div.className = 'alert-item';
        
        div.innerHTML = `
            <div class="alert-header">
                <span class="alert-icon">${alert.icon}</span>
                <span class="alert-type">${alert.type}</span>
                <span class="alert-timestamp">${alert.timestamp.toLocaleTimeString()}</span>
            </div>
            <div class="alert-description">${alert.description}</div>
            <div class="alert-transaction-id">Transaction: ${alert.transactionId}</div>
        `;

        div.addEventListener('click', () => {
            const transaction = this.transactions.find(t => t.id === alert.transactionId);
            if (transaction) {
                this.showTransactionDetails(transaction);
            }
        });

        return div;
    }

    updateStats() {
        document.getElementById('totalAlerts').textContent = this.alerts.filter(a => !a.acknowledged).length;
        document.getElementById('highRiskCount').textContent = this.transactions.filter(t => t.riskLevel === 'High' || t.riskLevel === 'Critical').length;
        document.getElementById('processedToday').textContent = this.totalProcessed.toLocaleString();
    }

    initializeCharts() {
        // Risk Distribution Chart
        const riskCtx = document.getElementById('riskDistributionChart').getContext('2d');
        this.charts.riskDistribution = new Chart(riskCtx, {
            type: 'doughnut',
            data: {
                labels: ['Low Risk', 'Medium Risk', 'High Risk', 'Critical Risk'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444', '#dc2626'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#f5f5f5',
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });

        // Alert Trends Chart
        const alertCtx = document.getElementById('alertTrendsChart').getContext('2d');
        this.charts.alertTrends = new Chart(alertCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Alerts per Hour',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#f5f5f5'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#f5f5f5'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#f5f5f5'
                        }
                    }
                }
            }
        });
    }

    updateCharts() {
        // Update risk distribution
        const riskCounts = [
            this.transactions.filter(t => t.riskLevel === 'Low').length,
            this.transactions.filter(t => t.riskLevel === 'Medium').length,
            this.transactions.filter(t => t.riskLevel === 'High').length,
            this.transactions.filter(t => t.riskLevel === 'Critical').length
        ];

        this.charts.riskDistribution.data.datasets[0].data = riskCounts;
        this.charts.riskDistribution.update();

        // Update alert trends (simplified)
        const now = new Date();
        const currentHour = now.getHours();
        const alertTrendsData = this.charts.alertTrends.data;
        
        if (alertTrendsData.labels.length === 0) {
            // Initialize with last 12 hours
            for (let i = 11; i >= 0; i--) {
                const hour = (currentHour - i + 24) % 24;
                alertTrendsData.labels.push(`${hour}:00`);
                alertTrendsData.datasets[0].data.push(Math.floor(Math.random() * 10));
            }
        }

        // Add current hour data
        if (alertTrendsData.labels.length > 12) {
            alertTrendsData.labels.shift();
            alertTrendsData.datasets[0].data.shift();
        }

        const currentAlerts = this.alerts.filter(alert => 
            alert.timestamp.getHours() === currentHour
        ).length;

        if (alertTrendsData.labels[alertTrendsData.labels.length - 1] !== `${currentHour}:00`) {
            alertTrendsData.labels.push(`${currentHour}:00`);
            alertTrendsData.datasets[0].data.push(currentAlerts);
        } else {
            alertTrendsData.datasets[0].data[alertTrendsData.datasets[0].data.length - 1] = currentAlerts;
        }

        this.charts.alertTrends.update();
    }

    initializePatterns() {
        this.amlPatterns.forEach(pattern => {
            this.patterns.set(pattern.type, 0);
        });
        this.updatePatternDisplay();
    }

    updatePatternDisplay() {
        const container = document.getElementById('patternsList');
        container.innerHTML = '';

        let activePatterns = 0;
        this.amlPatterns.forEach(patternInfo => {
            const count = this.patterns.get(patternInfo.type) || 0;
            if (count > 0) activePatterns++;

            const item = document.createElement('div');
            item.className = `pattern-item ${count > 0 ? 'active' : ''}`;
            
            item.innerHTML = `
                <div class="pattern-header">
                    <span class="pattern-name">${patternInfo.type}</span>
                    ${count > 0 ? `<span class="pattern-count">${count}</span>` : ''}
                </div>
                <div class="pattern-description">${patternInfo.description}</div>
            `;

            container.appendChild(item);
        });

        document.getElementById('patternCount').textContent = `${activePatterns} Active`;
    }

    startTransactionGeneration() {
        const generateInterval = () => {
            if (this.isRunning) {
                const transaction = this.generateTransaction();
                this.addTransaction(transaction);
                
                // Generate alerts every few seconds
                if (Math.random() < 0.3) {
                    this.updateAlertDisplay();
                }
                
                // Random interval between 1-4 seconds
                setTimeout(generateInterval, 1000 + Math.random() * 3000);
            }
        };

        generateInterval();
    }

    togglePause() {
        this.isRunning = !this.isRunning;
        const btn = document.getElementById('pauseBtn');
        
        if (this.isRunning) {
            btn.innerHTML = '⏸️ Pause';
            btn.className = 'btn btn--secondary';
            this.startTransactionGeneration();
        } else {
            btn.innerHTML = '▶️ Resume';
            btn.className = 'btn btn--primary';
        }
    }

    exportSAR() {
        const highRiskTransactions = this.transactions.filter(t => 
            t.riskLevel === 'High' || t.riskLevel === 'Critical'
        );

        const sarData = {
            reportDate: new Date().toISOString(),
            totalTransactions: highRiskTransactions.length,
            transactions: highRiskTransactions.map(t => ({
                id: t.id,
                timestamp: t.timestamp.toISOString(),
                amount: t.amount,
                currency: t.currency,
                riskScore: t.riskScore,
                patterns: t.patterns,
                riskFactors: t.riskFactors
            }))
        };

        const blob = new Blob([JSON.stringify(sarData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SAR_Report_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    updateDisplays() {
        this.updateTransactionDisplay();
        this.updateAlertDisplay();
        this.updateStats();
        this.updatePatternDisplay();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AMLDashboard();
});