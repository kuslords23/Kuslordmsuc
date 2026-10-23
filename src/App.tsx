.studio-view {
  padding: 20px 16px;
}

.studio-header h2 {
  font-size: 20px;
  margin-bottom: 8px;
}

.studio-header p {
  color: var(--muted);
  font-size: 13px;
}

.studio-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.form-group input,
.form-group select {
  background: var(--bg2);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--accent);
}

.form-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.form-row .form-group {
  flex: 1;
  min-width: 180px;
}

.submit-btn {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: white;
  font-weight: 700;
  font-size: 14px;
  padding: 14px 20px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  text-align: center;
  transition: opacity 0.2s;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-required-box {
  background: var(--card);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
}

.auth-required-box p {
  margin-bottom: 12px;
  color: var(--muted);
}

.alert.error {
  background: rgba(255, 70, 70, 0.15);
  border: 1px solid rgba(255, 70, 70, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  color: #ff6b6b;
  font-size: 13px;
}