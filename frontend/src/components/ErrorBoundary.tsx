import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <h1 className="text-lg font-semibold">Что-то пошло не так</h1>
            <p className="mt-2 break-words text-sm text-slate-500">
              {this.state.error.message || String(this.state.error)}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null })
                window.location.reload()
              }}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
