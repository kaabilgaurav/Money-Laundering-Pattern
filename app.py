from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import time
from threading import Thread
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import uuid
import logging

# ---------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# Flask App + SocketIO
# ---------------------------------------------------------
app = Flask(__name__)
app.config['SECRET_KEY'] = 'aml-detection-secret-key-2024'
socketio = SocketIO(app, cors_allowed_origins="*")

# ---------------------------------------------------------
# AML Detection Engine
# ---------------------------------------------------------
class AMLDetectionEngine:
    def __init__(self):
        self.patterns = {
            'structuring': {'threshold': 10000, 'frequency_limit': 5},
            'velocity': {'transaction_limit': 10, 'time_window': 3600},
            'geographic_risk': ['North Korea', 'Iran', 'Afghanistan', 'Myanmar', 'Syria']
        }
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.transaction_history = []
        self._initialize_model()

    def _initialize_model(self):
        np.random.seed(42)
        n_samples = 1000

        normal_data = np.random.multivariate_normal(
            [5000, 12, 3, 0, 2],
            [[1000000, 0, 0, 0, 0],
             [0, 36, 0, 0, 0],
             [0, 0, 4, 0, 0],
             [0, 0, 0, 1, 0],
             [0, 0, 0, 0, 1]],
            size=int(n_samples * 0.9)
        )

        suspicious_data = np.random.multivariate_normal(
            [9500, 2, 6, 1, 8],
            [[500000, 0, 0, 0, 0],
             [0, 9, 0, 0, 0],
             [0, 0, 1, 0, 0],
             [0, 0, 0, 1, 0],
             [0, 0, 0, 0, 4]],
            size=int(n_samples * 0.1)
        )

        training_data = np.vstack([normal_data, suspicious_data])
        training_data = self.scaler.fit_transform(training_data)
        self.isolation_forest.fit(training_data)
        logger.info("✅ ML model initialized successfully")

    def _safe_parse_datetime(self, ts: str):
        try:
            return datetime.fromisoformat(ts)
        except Exception:
            return datetime.now()

    def _calculate_velocity_score(self, customer_id, current_time):
        recent_transactions = [
            t for t in self.transaction_history
            if t.get('sender', {}).get('id') == customer_id and
               self._safe_parse_datetime(t.get('timestamp', datetime.now().isoformat())) >
               current_time - timedelta(hours=1)
        ]
        return len(recent_transactions)

    def detect_structuring(self, transaction, customer_history):
        amount = float(transaction.get('amount', 0))
        if 9000 <= amount < 10000:
            recent_similar = [
                t for t in customer_history
                if 9000 <= float(t.get('amount', 0)) < 10000 and
                   self._safe_parse_datetime(t.get('timestamp', datetime.now().isoformat())) >
                   datetime.now() - timedelta(days=7)
            ]
            if len(recent_similar) >= 3:
                return True, f"{len(recent_similar)} transactions near $10k in last 7 days"
        return False, ""

    def detect_layering(self, customer_history):
        if len(customer_history) >= 3:
            recent_countries = set()
            for t in customer_history[-10:]:
                recent_countries.add(t.get('sender', {}).get('location', ''))
                recent_countries.add(t.get('receiver', {}).get('location', ''))
            if len(recent_countries) >= 5:
                return True, f"Complex routing across {len(recent_countries)} locations"
        return False, ""

    def detect_smurfing(self, transaction):
        amount = float(transaction.get('amount', 0))
        timestamp = self._safe_parse_datetime(transaction.get('timestamp', datetime.now().isoformat()))
        receiver_id = transaction.get('receiver', {}).get('id', '')

        similar = [
            t for t in self.transaction_history
            if t.get('receiver', {}).get('id') == receiver_id and
               abs(float(t.get('amount', 0)) - amount) < 500 and
               self._safe_parse_datetime(t.get('timestamp', datetime.now().isoformat())) >
               timestamp - timedelta(hours=24) and
               t.get('sender', {}).get('id') != transaction.get('sender', {}).get('id')
        ]
        if len(similar) >= 5:
            return True, f"{len(similar)} similar txns from different senders"
        return False, ""

    def analyze_transaction(self, transaction):
        result = {
            'transaction_id': transaction.get('id'),
            'risk_score': 0,
            'risk_level': 'Low',
            'detected_patterns': [],
            'alerts': [],
            'ml_anomaly_score': 0
        }
        try:
            customer_id = transaction.get('sender', {}).get('id', 'unknown')
            customer_history = [t for t in self.transaction_history if t.get('sender', {}).get('id') == customer_id]

            patterns = []

            structuring, detail = self.detect_structuring(transaction, customer_history)
            if structuring:
                patterns.append(('Structuring', detail, 25))

            layering, detail = self.detect_layering(customer_history)
            if layering:
                patterns.append(('Layering', detail, 30))

            smurfing, detail = self.detect_smurfing(transaction)
            if smurfing:
                patterns.append(('Smurfing', detail, 25))

            for high_risk in self.patterns['geographic_risk']:
                if high_risk in transaction.get('sender', {}).get('location', '') or \
                   high_risk in transaction.get('receiver', {}).get('location', ''):
                    patterns.append(('Geographic Risk', f"Involving {high_risk}", 20))
                    break

            amount = float(transaction.get('amount', 0))
            if 'Cash' in transaction.get('payment_method', '') and amount > 50000:
                patterns.append(('Large Cash', f"Cash txn ${amount:,.2f}", 15))

            velocity = self._calculate_velocity_score(customer_id, datetime.now())
            if velocity > self.patterns['velocity']['transaction_limit']:
                patterns.append(('Velocity', f"{velocity} txns in last hour", 20))

            if amount > 10000 and amount % 1000 == 0:
                patterns.append(('Round Amount', f"Round amount ${amount:,.2f}", 10))

            try:
                features = [
                    amount,
                    self._safe_parse_datetime(transaction['timestamp']).hour,
                    self._safe_parse_datetime(transaction['timestamp']).weekday(),
                    1 if amount % 1000 == 0 else 0,
                    velocity
                ]
                scaled = self.scaler.transform([features])
                ml_score = self.isolation_forest.decision_function(scaled)[0]
                is_anomaly = self.isolation_forest.predict(scaled)[0] == -1
                if is_anomaly:
                    patterns.append(('ML Anomaly', f"Anomaly score {ml_score:.3f}", 20))
                result['ml_anomaly_score'] = float(ml_score)
            except Exception as e:
                logger.error(f"ML error: {e}")

            base_risk = min(amount / 100000 * 10, 10)
            pattern_risk = sum(p[2] for p in patterns)
            result['risk_score'] = min(100, int(base_risk + pattern_risk))
            result['detected_patterns'] = [{'type': p[0], 'description': p[1], 'score': p[2]} for p in patterns]

            if result['risk_score'] >= 76:
                result['risk_level'] = 'Critical'
            elif result['risk_score'] >= 51:
                result['risk_level'] = 'High'
            elif result['risk_score'] >= 26:
                result['risk_level'] = 'Medium'

            if result['risk_score'] > 50:
                result['alerts'].append({
                    'type': 'High Risk Transaction',
                    'message': f"Txn {transaction.get('id')} flagged",
                    'timestamp': datetime.now().isoformat(),
                    'severity': result['risk_level']
                })

            enriched = transaction.copy()
            enriched.update(result)
            self.transaction_history.append(enriched)
            if len(self.transaction_history) > 1000:
                self.transaction_history = self.transaction_history[-1000:]

        except Exception as e:
            logger.error(f"Txn analysis error: {e}")

        return result


# ---------------------------------------------------------
# Transaction Generator
# ---------------------------------------------------------
class TransactionGenerator:
    def __init__(self):
        self.currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"]
        self.methods = ["Wire Transfer", "Cash Deposit", "ACH", "Credit Card", "Cryptocurrency"]
        self.locations = ["New York, USA", "London, UK", "Dubai, UAE", "Singapore", "Zurich, Switzerland"]
        self.high_risk = ["North Korea", "Iran", "Afghanistan", "Myanmar", "Syria"]
        self.customers = [f"CUST_{i:06d}" for i in range(1, 501)]

    def generate_name(self):
        first = ["John", "Jane", "Michael", "Sarah", "David", "Emma"]
        last = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia"]
        return f"{random.choice(first)} {random.choice(last)}"

    def generate_transaction(self, suspicious=False):
        txn_id = f"TXN_{uuid.uuid4().hex[:8].upper()}"
        timestamp = datetime.now().isoformat()
        sender = random.choice(self.customers)
        receiver = random.choice([c for c in self.customers if c != sender])

        if suspicious:
            amount = random.choice([9500, 15000, 50000, 100000])
            method = random.choice(["Cash Deposit", "Wire Transfer"])
            sender_loc = random.choice(self.high_risk + self.locations)
            receiver_loc = random.choice(self.locations)
        else:
            amount = random.uniform(100, 10000)
            method = random.choice(self.methods)
            sender_loc = random.choice(self.locations)
            receiver_loc = random.choice(self.locations)

        return {
            "id": txn_id,
            "timestamp": timestamp,
            "amount": round(amount, 2),
            "currency": random.choice(self.currencies),
            "payment_method": method,
            "sender": {"id": sender, "name": self.generate_name(), "location": sender_loc},
            "receiver": {"id": receiver, "name": self.generate_name(), "location": receiver_loc},
            "reference": f"REF{random.randint(100000, 999999)}",
            "status": "Processed"
        }


aml_engine = AMLDetectionEngine()
generator = TransactionGenerator()
active_connections = []

# ---------------------------------------------------------
# Transaction Stream
# ---------------------------------------------------------
def generate_stream():
    while True:
        try:
            txn = generator.generate_transaction(suspicious=random.random() < 0.2)
            analysis = aml_engine.analyze_transaction(txn)
            enriched = txn.copy()
            enriched.update(analysis)
            socketio.emit('new_transaction', enriched)
            if analysis['risk_score'] > 50:
                alert = {
                    'id': f"ALERT_{uuid.uuid4().hex[:8].upper()}",
                    'transaction_id': txn['id'],
                    'risk_score': analysis['risk_score'],
                    'risk_level': analysis['risk_level'],
                    'patterns': analysis['detected_patterns'],
                    'timestamp': datetime.now().isoformat()
                }
                socketio.emit('new_alert', alert)
            time.sleep(random.uniform(1, 4))
        except Exception as e:
            logger.error(f"Stream error: {e}")
            time.sleep(5)

# ---------------------------------------------------------
# Flask Routes
# ---------------------------------------------------------
@app.route('/api/health')
def health():
    return jsonify({
        'status': 'healthy',
        'time': datetime.now().isoformat(),
        'processed': len(aml_engine.transaction_history),
        'active_clients': len(active_connections)
    })

# ---------------------------------------------------------
# Socket Events
# ---------------------------------------------------------
@socketio.on('connect')
def connect():
    active_connections.append(request.sid)
    emit('connection_status', {
        'status': 'connected',
        'time': datetime.now().isoformat()
    })
    for txn in aml_engine.transaction_history[-5:]:
        emit('new_transaction', txn)

@socketio.on('disconnect')
def disconnect():
    if request.sid in active_connections:
        active_connections.remove(request.sid)

# ---------------------------------------------------------
# Main
# ---------------------------------------------------------
if __name__ == '__main__':
    Thread(target=generate_stream, daemon=True).start()
    logger.info("🚀 AML Detection Server Started")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
