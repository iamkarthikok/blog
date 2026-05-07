import type { ReactNode } from 'react'
import './UI.css'

type FrameProps = {
  topLeft?: ReactNode
  topRight?: ReactNode
  bottomLeft?: ReactNode
  bottomRight?: ReactNode
  dimmed?: boolean
  children: ReactNode
}

export function UI({
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  dimmed,
  children,
}: FrameProps) {
  const cls = (corner: string) =>
    `frame__corner ${corner} ${dimmed ? 'is-dimmed' : ''}`
  return (
    <>
      {topLeft && <div className={cls('frame__corner--tl')}>{topLeft}</div>}
      {topRight && <div className={cls('frame__corner--tr')}>{topRight}</div>}
      {children}
      {bottomLeft && (
        <div className={cls('frame__corner--bl')}>{bottomLeft}</div>
      )}
      {bottomRight && (
        <div className={cls('frame__corner--br')}>{bottomRight}</div>
      )}
    </>
  )
}

type StatusProps =
  | { kind: 'loading'; message?: string }
  | { kind: 'error'; message: string }

export function Status(props: StatusProps) {
  return (
    <div className="status">
      <span
        className={`status__label ${
          props.kind === 'error' ? 'status__label--error' : ''
        }`}
      >
        {props.kind === 'loading' ? 'loading' : 'service unavailable'}
        {props.kind === 'loading' && (
          <span className="status__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        )}
      </span>
      {props.message && (
        <span className="status__detail muted">{props.message}</span>
      )}
    </div>
  )
}
