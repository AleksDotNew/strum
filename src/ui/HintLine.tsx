export interface HintLineProps {
  message: string
  isError?: boolean
}

export function HintLine(props: HintLineProps) {
  return (
    <div
      class={`hint-line ${props.isError ? 'error' : ''}`}
      data-testid="hint-line"
    >
      {props.message}
    </div>
  )
}
