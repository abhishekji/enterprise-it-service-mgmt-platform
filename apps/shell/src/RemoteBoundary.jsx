import React from 'react';

// Keeps the shell alive when a micro frontend fails to load.
export default class RemoteBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <p style={{ color: 'crimson' }}>The {this.props.name} module is currently unavailable.</p>;
    return this.props.children;
  }
}
