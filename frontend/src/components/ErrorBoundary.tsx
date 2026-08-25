import { Component, type ReactNode } from 'react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // A production telemetry provider can be attached here.
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-canvas p-6">
          <div className="max-w-md text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-danger">
              Unexpected error
            </p>
            <h1 className="mt-3 text-3xl font-extrabold">This page could not be displayed.</h1>
            <p className="mt-3 text-slate-500">
              Refresh the page to recover. Your account data has not been changed.
            </p>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Refresh page
            </Button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
