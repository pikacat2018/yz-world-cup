import { Component, type ErrorInfo, type ReactNode } from "react";

type RootErrorBoundaryProps = {
  children: ReactNode;
};

type RootErrorBoundaryState = {
  hasError: boolean;
};

export default class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[root] render failed", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="editor-access-page">
          <section className="editor-access-panel passive-workspace-panel" aria-live="polite">
            <span className="eyebrow">RUNTIME ERROR</span>
            <h1>页面运行中断</h1>
            <p>已拦截前端运行时异常，避免整页黑屏。请先刷新；如果反复出现，再检查浏览器存储空间或控制台报错。</p>
            <button onClick={this.handleReload} type="button">
              刷新页面
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
