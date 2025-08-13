interface ProgressProps {
    value: number;
    className?: string;
}

export function Progress({ value, className }: ProgressProps) {
    const clamped = Math.min(100, Math.max(0, value));
    return (
        <div className={`progress ${className ?? ''}`.trim()}>
            <div className="progress__bar" style={{ width: `${clamped}%` }} />
        </div>
    );
}