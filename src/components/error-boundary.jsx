import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught an error:', error, info?.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#fef2f2', borderRadius: '1.5rem', border: '1px solid #fecaca', margin: '1rem 0' }}>
                    <p style={{ fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>Etwas ist schiefgelaufen.</p>
                    <p style={{ fontSize: '0.9rem', color: '#7f1d1d' }}>Bitte lade die Seite neu. Falls das Problem bestehen bleibt, kontaktiere uns über die Support-Adresse im Footer.</p>
                </div>
            );
        }
        return this.props.children;
    }
}
